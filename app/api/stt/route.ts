import { logged } from "@/lib/devlog";
// Speech to text. Default: Groq Whisper (free tier). Deepgram Nova-3 only when PAID_VOICE=1.
// Groq: https://console.groq.com/docs/speech-to-text (OpenAI-compatible, multipart form)
// Deepgram: https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded
// The client sends the MediaRecorder blob as the raw body, with its type as Content-Type (audio/webm, audio/mp4 on Safari).
const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const DG_URL = "https://api.deepgram.com/v1/listen";
const MAX_BYTES = 2 * 1024 * 1024; // about 30 s of hold-to-talk audio, with room to spare
const HINTS = new Set(["te", "hi", "en"]);
// Whisper's verbose_json names the language in full ("english"); the app uses short codes.
const WHISPER_LANG: Record<string, string> = { english: "en", hindi: "hi", telugu: "te" };
const EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav" };

const tooBig = () => Response.json({ error: "That recording is too long. Keep each turn under 30 seconds." }, { status: 413 });
const paid = () => process.env.PAID_VOICE === "1";

async function handler(req: Request) {
  const key = paid() ? process.env.DEEPGRAM_API_KEY : process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "Voice input is off: no speech-to-text key is set. Type your line instead." }, { status: 503 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return tooBig();

  const audio = await req.arrayBuffer().catch(() => null);
  if (!audio || audio.byteLength < 1000)
    return Response.json({ error: "No audio came through. Hold the button while you speak." }, { status: 400 });
  if (audio.byteLength > MAX_BYTES) return tooBig();

  const raw = req.headers.get("content-type")?.split(";")[0] ?? "";
  const type = raw.startsWith("audio/") ? raw : "audio/webm";
  const q = new URL(req.url).searchParams;
  const langs = (q.get("langs")?.split(",") ?? []).filter((l) => HINTS.has(l));
  const lang = HINTS.has(q.get("lang") ?? "") ? q.get("lang")! : undefined; // the language the call is in now

  const t0 = Date.now();
  try {
    const out = paid() ? await deepgram(key, audio, type, langs) : await groq(key, audio, type, langs, lang);
    if ("error" in out) return Response.json(out, { status: 502 });
    return Response.json({ ...out, ms: Date.now() - t0 });
  } catch {
    return Response.json({ error: "Speech-to-text did not answer. Try again or type." }, { status: 504 });
  }
}

async function groq(key: string, audio: ArrayBuffer, type: string, langs: string[], lang?: string) {
  // Pin Telugu/Hindi when the call is in it (or the bot speaks only that). Unpinned, Whisper hears Telugu as Tamil
  // and writes it in the wrong script. English stays unpinned so a caller can switch.
  const pin = lang === "te" || lang === "hi" ? lang : langs.length === 1 ? langs[0] : undefined;
  if (pin && langs.length > 1) {
    // The caller can switch language mid-call, and pinned Whisper writes any other language as nonsense in the
    // pinned script. So it also hears the turn unpinned, only to tell which language was spoken.
    // ponytail: two Whisper calls per turn on the free tier; fine for a test call, drop to one if it rate-limits.
    const [a, b] = await Promise.all([whisper(key, audio, type, pin), whisper(key, audio, type)]);
    if (!("raw" in b)) return a;
    const heard = b.raw === "english" ? "en" : b.raw === "hindi" ? "hi" : "te"; // Telugu comes back as "tamil" and others
    if (heard === pin || !langs.includes(heard)) return "raw" in a ? a : b;
    // One English-looking word ("Sorry." for a Telugu "సరే") is not enough to leave the call's language.
    if (heard === "en") return (b.text ?? "").split(/\s+/).length > 1 ? b : a;
    return whisper(key, audio, type, heard);
  }
  const out = await whisper(key, audio, type, pin);
  // Unpinned and it guessed a language this bot doesn't speak (Telugu usually comes back as "tamil"): hear it again as Telugu.
  if (!pin && "raw" in out && !["english", "hindi"].includes(out.raw ?? "") && langs.includes("te")) return whisper(key, audio, type, "te");
  return out;
}

async function whisper(key: string, audio: ArrayBuffer, type: string, pin?: string) {
  const form = new FormData();
  form.append("file", new Blob([audio], { type }), `turn.${EXT[type] ?? "webm"}`);
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "verbose_json");
  if (pin) form.append("language", pin);
  // One example line in the call's language only: an example in a second script leaks that script into the text.
  const SAMPLE: Record<string, string> = { te: "సరే, నాకు ఇప్పుడు కొంచెం టైం ఉంది.", hi: "ठीक है, अभी मेरे पास थोड़ा टाइम है।", en: "Okay, I have a minute now." };
  form.append("prompt", SAMPLE[pin ?? "en"] ?? SAMPLE.en);
  form.append("temperature", "0");
  const res = await fetch(GROQ_URL, {
    method: "POST",
    // Groq's Cloudflare blocks default user agents.
    headers: { Authorization: `Bearer ${key}`, "User-Agent": "rehearse/0.1" },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return { error: `Speech-to-text failed (Groq ${res.status}). Try again or type.` };
  const j = await res.json();
  const text = String(j?.text ?? "").trim();
  // Whisper invents these on silence or noise: treat them as "heard nothing".
  const ghost = /^(thank you\.?|thanks for watching!?|you\.?|bye\.?|\.+)$/i.test(text);
  // Whisper also writes words for breath, a cough or room noise; it says how likely a segment held no speech at all.
  const segs: { no_speech_prob?: number }[] = Array.isArray(j?.segments) ? j.segments : [];
  const silent = segs.length > 0 && segs.every((x) => (x.no_speech_prob ?? 0) > 0.6);
  const raw = String(j?.language ?? "").toLowerCase();
  return { text: ghost || silent ? "" : text, lang: WHISPER_LANG[raw] ?? pin, raw };
}

async function deepgram(key: string, audio: ArrayBuffer, type: string, langs: string[]) {
  const params = new URLSearchParams({ model: "nova-3", language: "multi", smart_format: "true" });
  // language_hint nudges Nova-3 towards the bot's languages. It can still hear the others.
  for (const l of langs) params.append("language_hint", l);
  const res = await fetch(`${DG_URL}?${params}`, {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": type },
    body: audio,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return { error: `Speech-to-text failed (Deepgram ${res.status}). Try again or type.` };
  const alt = (await res.json())?.results?.channels?.[0]?.alternatives?.[0];
  // languages[] is sorted by word count, so the first one is the main language of the turn.
  return { text: String(alt?.transcript ?? ""), lang: alt?.languages?.[0] as string | undefined };
}

export const POST = logged("stt", handler);
