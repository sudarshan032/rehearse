"use client";
// Free voice for the Voice test, all in the browser: no key, no server, no credits.
// Default: the system's own voices (speechSynthesis): natural, fast to start, and they read Telugu and Hindi.
// They also report each word as it is spoken, so the page can show the word being said.
// Optional: NEXT_PUBLIC_VOICE=kitten uses KittenTTS nano 0.8 (https://github.com/KittenML/KittenTTS) for English only;
// it sounded slow and robotic in real use, so it is off by default.
//
//   await preloadVoice();                                              // optional warm-up when the Voice test opens
//   const { firstSoundMs, engine, done } = await speak(reply, "en-IN", (i) => showUpTo(i));
//
// Model files: `node scripts/get-kitten.mjs` saves them to public/models/kitten/. Missing there, they load from Hugging Face.
//
// Telugu: the system Telugu voice (macOS "Geeta") sounds robotic, so Telugu is spoken by Piper voices
// (https://huggingface.co/rhasspy/piper-voices, trained on IIT Madras IndicTTS, free for non-commercial use), run in the
// browser with onnxruntime-web. Text → phonemes is lib/telugu-ipa.ts. The model (63 MB) downloads once, is kept in the
// browser's cache, and the system voice speaks until it is ready.

export type SpeakLang = "te-IN" | "hi-IN" | "en-IN";
const KITTEN = process.env.NEXT_PUBLIC_VOICE === "kitten";

// ponytail: onnxruntime-web comes from the CDN (same pinned build as space/telugu-onnx), not the bundle.
const ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
const SOURCES = ["/models/kitten/", "https://huggingface.co/KittenML/kitten-tts-nano-0.8-int8/resolve/main/"];
const MODEL = "kitten_tts_nano_v0_8.onnx";
const VOICE = "expr-voice-2-f"; // "Bella"
const SPEED = 0.8; // speed_priors for this voice in the model's config.json
const RATE = 24_000;
const TRIM = 5000; // the model ends every clip with ~0.2 s of noise; the official code cuts it

// Symbol table from kittentts/onnx_model.py (TextCleaner). Index = token id.
const PUNCT = ';:,.!?¡¿—…"«»“” ';
const IPA = "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ";
const IDS = new Map(["$", ...PUNCT, ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", ...IPA].map((c, i) => [c, i]));
const PUNCT_RUN = /([;:,.!?¡¿—…"«»“”]+)/;

type Tensor = { data: Float32Array };
type Ort = {
  env: { wasm: { wasmPaths: string } };
  Tensor: new (type: string, data: BigInt64Array | Float32Array, dims: number[]) => unknown;
  InferenceSession: { create(model: Uint8Array, opts: object): Promise<{ run(feeds: object): Promise<Record<string, Tensor>> }> };
};
type Kitten = (text: string) => Promise<Float32Array>;

const PIPER_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/";
export const PIPER: { name: string; id: string }[] = [
  { name: "Padmavathi (natural)", id: "padmavathi" },
  { name: "Maya (natural)", id: "maya" },
  { name: "Venkatesh (natural, male)", id: "venkatesh" },
];
const PIPER_RATE = 22_050;
type Piper = (text: string) => Promise<Float32Array>;
const pipers = new Map<string, Promise<Piper>>();
const ready = new Set<string>();

// Kept in the browser's Cache Storage, so the 63 MB comes down only once.
async function cachedFetch(url: string) {
  const cache = typeof caches !== "undefined" ? await caches.open("rehearse-voices").catch(() => null) : null;
  const hit = await cache?.match(url);
  if (hit) return hit.arrayBuffer();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download the Telugu voice (${res.status}).`);
  await cache?.put(url, res.clone()).catch(() => {});
  return res.arrayBuffer();
}

function loadPiper(id: string): Promise<Piper> {
  let p = pipers.get(id);
  if (p) return p;
  p = (async () => {
    const ort: Ort = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT}ort.wasm.min.mjs`);
    ort.env.wasm.wasmPaths = ORT;
    const file = `${PIPER_BASE}${id}/medium/te_IN-${id}-medium.onnx`;
    const [{ teluguIPA }, model, cfg] = await Promise.all([
      import("./telugu-ipa"),
      cachedFetch(file),
      cachedFetch(`${file}.json`).then((b) => JSON.parse(new TextDecoder().decode(b))),
    ]);
    const map: Record<string, number[]> = cfg.phoneme_id_map;
    const { noise_scale, length_scale, noise_w } = cfg.inference;
    const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    // Same ids as Piper: start, each phoneme followed by the pad, end.
    const say = async (text: string) => {
      const ipa = teluguIPA(/[.!?,;:]$/.test(text) ? text : `${text}.`);
      const ids = [...map["^"], ...map["_"], ...[...ipa].flatMap((c) => (map[c] ? [...map[c], ...map["_"]] : [])), ...map["$"]];
      const out = await session.run({
        input: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]),
        input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
        // A little slower than the model's default: phone calls are easier to follow.
        scales: new ort.Tensor("float32", new Float32Array([noise_scale, length_scale * 1.05, noise_w]), [3]),
      });
      return Object.values(out)[0].data;
    };
    await say("సరే."); // warm-up: the first run is slow
    ready.add(id);
    return say;
  })();
  p.catch(() => pipers.delete(id)); // a later call can retry
  pipers.set(id, p);
  return p;
}
const piperOf = (name: string) => PIPER.find((v) => v.name === name);
/** For the voice picker: load a Piper voice by its name (resolves at once for a system voice). */
export const loadVoiceByName = async (name: string) => {
  const v = piperOf(name);
  if (v) await loadPiper(v.id);
};

/** Start downloading the picked (or default) Telugu voice, so it is ready before the bot speaks Telugu. */
export function preloadTelugu() {
  let want = "";
  try {
    want = localStorage.getItem("rh-voice-te-IN") ?? "";
  } catch {}
  const v = want ? piperOf(want) : PIPER[0];
  if (v) loadPiper(v.id).catch(() => {});
}

let kitten: Promise<Kitten> | null = null;
let ctx: AudioContext | null = null;
let turn = 0; // each speak() call bumps this; older playback stops when it changes
let sources: AudioBufferSourceNode[] = [];

async function fetchModelFile(name: string) {
  for (const base of SOURCES) {
    const res = await fetch(base + name).catch(() => null);
    if (res?.ok) return res.arrayBuffer();
  }
  throw new Error(`Could not download the voice model (${name}).`);
}

// voices.npz is a stored (uncompressed) zip of .npy files, one 400 x 256 float32 table per voice.
function readVoice(buf: ArrayBuffer, name: string) {
  const u8 = new Uint8Array(buf);
  const text = new TextDecoder("ascii").decode(u8); // only used to find ASCII markers; offsets stay byte offsets
  const at = text.indexOf("NUMPY", text.indexOf(`${name}.npy`)) - 1;
  const headerLen = u8[at + 8] | (u8[at + 9] << 8);
  const shape = text.slice(at + 10, at + 10 + headerLen).match(/\((\d+), (\d+)\)/);
  if (at < 0 || !shape) throw new Error("The voice file looks broken. Run node scripts/get-kitten.mjs again.");
  const [rows, cols] = [Number(shape[1]), Number(shape[2])];
  const start = at + 10 + headerLen;
  return { rows, cols, data: new Float32Array(u8.slice(start, start + rows * cols * 4).buffer) };
}

function loadKitten(): Promise<Kitten> {
  kitten ??= (async () => {
    const ort: Ort = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT}ort.wasm.min.mjs`);
    ort.env.wasm.wasmPaths = ORT;
    const [{ phonemize }, model, voices] = await Promise.all([import("phonemizer"), fetchModelFile(MODEL), fetchModelFile("voices.npz")]);
    const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    const style = readVoice(voices, VOICE);

    // eSpeak drops punctuation, but the model uses it for pauses: phonemize the words between punctuation, keep the marks.
    async function phonemes(text: string) {
      let out = "";
      for (const part of text.split(PUNCT_RUN))
        out += PUNCT_RUN.test(part) ? `${part} ` : part.trim() ? `${(await phonemize(part, "en-us")).join(" ")}` : "";
      return out.trim();
    }

    const say = async (raw: string) => {
      const text = /[.!?,;:]$/.test(raw) ? raw : `${raw},`;
      // Same as the Python tokenizer: words and single marks, joined by spaces, then mapped to ids.
      const spaced = ((await phonemes(text)).match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]/gu) ?? []).join(" ");
      const ids = [0, ...[...spaced].flatMap((c) => (IDS.has(c) ? [IDS.get(c)!] : [])), 0];
      const row = Math.min(raw.length, style.rows - 1);
      const out = await session.run({
        input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]),
        style: new ort.Tensor("float32", style.data.slice(row * style.cols, (row + 1) * style.cols), [1, style.cols]),
        speed: new ort.Tensor("float32", new Float32Array([SPEED]), [1]),
      });
      return out.waveform.data.slice(0, -TRIM);
    };
    await say("Hi."); // warm-up run: the first inference is slow, so pay for it here, not on the first reply
    return say;
  })();
  kitten.catch(() => (kitten = null)); // let a later call retry (e.g. after the network comes back)
  return kitten;
}

async function audioReady() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  if (ctx.state !== "running") throw new Error("The browser blocked sound. Click the page once, then try again.");
  return ctx;
}

/** Stop any reply that is playing. */
export function stopSpeaking() {
  stopAll();
}

function stopAll() {
  turn++;
  for (const s of sources) s.stop();
  sources = [];
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

// Short sentence pieces, so the first one is ready fast and the rest are made while it plays.
function sentences(text: string) {
  return (text.match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter((s) => /\p{L}|\p{N}/u.test(s));
}

// Queue one clip right after the previous one, so the pieces play without gaps.
function play(ac: AudioContext, wave: Float32Array, at: number, rate = RATE) {
  const buf = ac.createBuffer(1, wave.length, rate);
  buf.copyToChannel(new Float32Array(wave), 0);
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(ac.destination);
  const start = Math.max(at, ac.currentTime);
  src.start(start);
  sources.push(src);
  return start + buf.duration;
}

async function kittenSay(text: string, t0: number) {
  const my = turn;
  const [say, ac] = await Promise.all([loadKitten(), audioReady()]);
  const [first, ...rest] = sentences(text);
  if (!first) throw new Error("Nothing to say.");
  const wave = await say(first);
  if (my !== turn) throw new Error("Stopped: a newer reply is playing.");
  let at = play(ac, wave, 0);
  const firstSoundMs = performance.now() - t0;
  // The rest is made while the first piece plays. ponytail: a failure mid-reply just ends the audio early.
  const done = (async () => {
    for (const part of rest) {
      const next = await say(part);
      if (my !== turn) return;
      at = play(ac, next, at);
    }
    while (my === turn && ac.currentTime < at) await new Promise((r) => setTimeout(r, 50));
  })().catch(() => {});
  return { firstSoundMs, engine: "KittenTTS nano 0.8 (in browser)", done };
}

// Piper, sentence by sentence: the first sentence plays while the next is made. Words are shown at the pace of each clip.
async function piperSay(id: string, text: string, t0: number, onWord?: (end: number) => void) {
  const my = turn;
  const [say, ac] = await Promise.all([loadPiper(id), audioReady()]);
  const parts = sentences(text);
  if (!parts.length) throw new Error("Nothing to say.");
  const clips: { at: number; end: number; from: number; to: number }[] = [];
  let at = 0, pos = 0;
  const add = async (part: string) => {
    const wave = await say(part);
    if (my !== turn) throw new Error("Stopped: a newer reply is playing.");
    const from = text.indexOf(part, pos), to = from + part.length;
    pos = to;
    const start = Math.max(at, ac.currentTime);
    at = play(ac, wave, at, PIPER_RATE);
    clips.push({ at: start, end: at, from, to });
  };
  await add(parts[0]);
  const firstSoundMs = performance.now() - t0;
  const done = (async () => {
    const tick = setInterval(() => {
      const now = ac.currentTime, c = clips.find((x) => now >= x.at && now < x.end);
      if (c) onWord?.(Math.round(c.from + ((now - c.at) / (c.end - c.at)) * (c.to - c.from)));
    }, 100);
    try {
      for (const part of parts.slice(1)) await add(part);
      while (my === turn && ac.currentTime < at) await new Promise((r) => setTimeout(r, 50));
    } finally {
      clearInterval(tick);
      if (my === turn) onWord?.(text.length);
    }
  })().catch(() => {});
  return { firstSoundMs, engine: `Piper ${id} (in browser)`, done };
}

function browserVoices(): Promise<SpeechSynthesisVoice[]> {
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  // Chrome fills the list a moment after page load.
  return new Promise((ok) => {
    const done = () => ok(speechSynthesis.getVoices());
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

const norm = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();
// Best-sounding first: downloaded Enhanced/Premium voices, then Google's online voices, then the rest.
// The bots are written as women ("Priya"), so known female voices come first. ponytail: a name list, since
// browsers don't say a voice's gender; add names when new voices show up.
const MALE = /\b(male|rishi|aman|daniel|alex|fred|ravi|hemant|madhur|prabhat|mohan|arthur|oliver)\b/i;
const FEMALE = /\b(female|tara|veena|lekha|geeta|isha|kiyara|neerja|swara|shruti|samantha|karen|moira|tessa)\b|^google (?!.*\bmale\b)/i;
// Gender first (a woman's voice beats an Indian man's voice for "Priya"), then Indian locale, then quality.
const rank = (v: SpeechSynthesisVoice, lang?: SpeakLang) =>
  (FEMALE.test(v.name) ? 6 : 0) - (MALE.test(v.name) ? 6 : 0) + (lang && norm(v) === lang.toLowerCase() ? 4 : 0) +
  (/enhanced|premium|natural|neural/i.test(v.name) ? 3 : 0) + (/^google/i.test(v.name) ? 1 : 0) + (v.localService ? 0.5 : 0);
const PREF = (lang: SpeakLang) => `rh-voice-${lang}`;

/** The voices this browser has for a language, best first, and the one the user picked (if any). */
export async function voicesFor(lang: SpeakLang) {
  if (typeof speechSynthesis === "undefined") return { list: [], picked: "" };
  const list = (await browserVoices()).filter((v) => norm(v).startsWith(lang.slice(0, 2).toLowerCase()))
    .sort((a, b) => rank(b, lang) - rank(a, lang))
    .map((v) => v.name);
  if (lang === "te-IN") list.unshift(...PIPER.map((v) => v.name));
  let picked = "";
  try {
    picked = localStorage.getItem(PREF(lang)) ?? "";
  } catch {}
  return { list: [...new Set(list)], picked };
}
export function pickVoiceName(lang: SpeakLang, name: string) {
  try {
    localStorage.setItem(PREF(lang), name);
  } catch {}
}

function pickVoice(all: SpeechSynthesisVoice[], lang: SpeakLang) {
  let want = "";
  try {
    want = localStorage.getItem(PREF(lang)) ?? "";
  } catch {}
  const mine = want && all.find((v) => v.name === want);
  if (mine) return mine;
  // Same order as the picker shows, so what you hear is the first voice in the list.
  const best = (pre: string, l: SpeakLang) => all.filter((x) => norm(x).startsWith(pre)).sort((a, b) => rank(b, l) - rank(a, l))[0];
  return best(lang.slice(0, 2).toLowerCase(), lang) ?? best("en", "en-IN");
}

async function browserSay(text: string, lang: SpeakLang, t0: number, onWord?: (end: number) => void) {
  if (typeof speechSynthesis === "undefined") throw new Error("This browser has no built-in voice.");
  const voice = pickVoice(await browserVoices(), lang);
  let finish = () => {};
  const done = new Promise<void>((r) => (finish = r));
  return new Promise<Spoken>((ok, fail) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    // Word timing: the voice reports each word; if it never does, move along at a normal talking speed.
    let heardBoundary = false, guess = 0;
    u.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      heardBoundary = true;
      const m = text.slice(e.charIndex).match(/^\S+/);
      onWord?.(e.charIndex + (m?.[0].length ?? 0));
    };
    u.onend = () => {
      clearInterval(guess);
      onWord?.(text.length);
      finish();
    };
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    const timer = setTimeout(() => fail(new Error("The browser voice did not start. Click the page once, then try again.")), 8000);
    u.onstart = () => {
      clearTimeout(timer);
      const at = performance.now();
      guess = window.setInterval(() => !heardBoundary && onWord?.(Math.round(((performance.now() - at) / 1000) * 15)), 120);
      ok({ firstSoundMs: performance.now() - t0, engine: `System voice (${voice?.name ?? lang})`, done });
    };
    u.onerror = (e) => {
      clearTimeout(timer);
      clearInterval(guess);
      finish();
      fail(new Error(`The browser voice failed (${e.error}).`));
    };
    speechSynthesis.speak(u);
  });
}

type Spoken = { firstSoundMs: number; engine: string; done: Promise<void> };

/** Speak a reply. Resolves when the first sound starts playing (time it with firstSoundMs); `done` resolves when it ends. */
export async function speak(text: string, lang: SpeakLang, onWord?: (end: number) => void): Promise<Spoken> {
  const t0 = performance.now();
  stopAll();
  const clean = text.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();
  if (!clean) throw new Error("Nothing to say.");
  if (lang === "te-IN") {
    let want = "";
    try {
      want = localStorage.getItem(PREF(lang)) ?? "";
    } catch {}
    const v = want ? piperOf(want) : PIPER[0];
    if (v && ready.has(v.id)) return piperSay(v.id, clean, t0, onWord);
    if (v) {
      loadPiper(v.id).catch(() => {}); // still downloading: the system voice speaks this one
      const r = await browserSay(clean, lang, t0, onWord);
      return { ...r, engine: `${r.engine}, Piper ${v.id} still loading` };
    }
  }
  if (lang !== "en-IN" || !KITTEN) return browserSay(clean, lang, t0, onWord);
  try {
    return await kittenSay(clean, t0);
  } catch (e) {
    if (e instanceof Error && /^(The browser blocked|Stopped)/.test(e.message)) throw e;
    const r = await browserSay(clean, lang, t0, onWord); // KittenTTS could not load: use the built-in voice
    return { ...r, engine: `${r.engine}, KittenTTS failed` };
  }
}

/** Optional warm-up: download and load the KittenTTS model before the first reply. */
export async function preloadVoice(): Promise<void> {
  preloadTelugu();
  if (KITTEN) await loadKitten();
  else if (typeof speechSynthesis !== "undefined") await browserVoices();
}

// Dev only: lets the test script make a Telugu clip in a real browser and time it.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production")
  (window as unknown as { __piper: unknown }).__piper = async (text: string, id = PIPER[0].id) => {
    const say = await loadPiper(id);
    const t0 = performance.now();
    const wave = await say(text);
    return { ms: performance.now() - t0, wave: Array.from(wave) };
  };
