"use client";
// Free voice for the Voice test, all in the browser: no key, no server, no credits.
// English: KittenTTS nano 0.8 int8 (https://github.com/KittenML/KittenTTS) on onnxruntime-web, with eSpeak NG
// phonemes from the `phonemizer` package. Telugu and Hindi: the browser's own speechSynthesis voices
// (KittenTTS is English only). If KittenTTS cannot load, English falls back to speechSynthesis too.
//
//   await preloadVoice();                                  // optional warm-up when the Voice test opens
//   const { firstSoundMs, engine } = await speak(reply, "en-IN");   // resolves when the first sound plays
//
// Model files: `node scripts/get-kitten.mjs` saves them to public/models/kitten/. Missing there, they load from Hugging Face.

export type SpeakLang = "te-IN" | "hi-IN" | "en-IN";

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
function play(ac: AudioContext, wave: Float32Array, at: number) {
  const buf = ac.createBuffer(1, wave.length, RATE);
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
  void (async () => {
    for (const part of rest) {
      const next = await say(part);
      if (my !== turn) return;
      at = play(ac, next, at);
    }
  })().catch(() => {});
  return { firstSoundMs, engine: "KittenTTS nano 0.8 (in browser)" };
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

function pickVoice(all: SpeechSynthesisVoice[], lang: SpeakLang) {
  // On-device voices first: they start faster than network ones (e.g. Chrome's "Google" voices).
  const voices = [...all].sort((a, b) => Number(b.localService) - Number(a.localService));
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();
  const tries = [lang.toLowerCase(), lang.slice(0, 2), "en-in", "en"];
  for (const t of tries) {
    const v = voices.find((x) => norm(x) === t) ?? voices.find((x) => norm(x).startsWith(t));
    if (v) return v;
  }
  return undefined;
}

async function browserSay(text: string, lang: SpeakLang, t0: number) {
  if (typeof speechSynthesis === "undefined") throw new Error("This browser has no built-in voice.");
  const voice = pickVoice(await browserVoices(), lang);
  return new Promise<{ firstSoundMs: number; engine: string }>((ok, fail) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    const timer = setTimeout(() => fail(new Error("The browser voice did not start. Click the page once, then try again.")), 8000);
    u.onstart = () => {
      clearTimeout(timer);
      ok({ firstSoundMs: performance.now() - t0, engine: `Browser voice (${voice?.name ?? lang})` });
    };
    u.onerror = (e) => {
      clearTimeout(timer);
      fail(new Error(`The browser voice failed (${e.error}).`));
    };
    speechSynthesis.speak(u);
  });
}

/** Speak a reply. Resolves when the first sound starts playing (time it with firstSoundMs). */
export async function speak(text: string, lang: SpeakLang): Promise<{ firstSoundMs: number; engine: string }> {
  const t0 = performance.now();
  stopAll();
  const clean = text.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();
  if (!clean) throw new Error("Nothing to say.");
  if (lang !== "en-IN") return browserSay(clean, lang, t0);
  try {
    return await kittenSay(clean, t0);
  } catch (e) {
    if (e instanceof Error && /^(The browser blocked|Stopped)/.test(e.message)) throw e;
    const r = await browserSay(clean, lang, t0); // KittenTTS could not load: use the built-in voice
    return { ...r, engine: `${r.engine}, KittenTTS failed` };
  }
}

/** Optional warm-up: download and load the KittenTTS model before the first reply. */
export async function preloadVoice(): Promise<void> {
  await loadKitten();
}
