import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { TTS_LANGS, VOICES } from "@/lib/voices";
import { logged } from "@/lib/devlog";

// Paid voice, OFF by default: returns 503 unless PAID_VOICE=1. The free voice is lib/speak.ts (in the browser).
// Murf Falcon 2.1 HTTP streaming: https://murf.ai/api/docs/api-reference/text-to-speech/stream
const MURF_URL = "https://global.api.murf.ai/v1/speech/stream";
const MAX_CHARS = 300;
const DAILY_CAP = 40;
// Vercel functions can only write to /tmp. Locally the cache is .cache/tts (git-ignored).
const CACHE_DIR = path.join(process.env.VERCEL ? "/tmp" : process.cwd(), ".cache", "tts");

// ponytail: in-memory counter, per server instance, resets on restart. Ceiling: 40 Murf calls per day
// site-wide (Murf free tier is $10/month). Move it to a shared store if the public site gets real traffic.
const today = { day: "", calls: 0 };

function callsLeft() {
  const day = new Date().toISOString().slice(0, 10);
  if (today.day !== day) Object.assign(today, { day, calls: 0 });
  return DAILY_CAP - today.calls;
}

const Body = z.object({
  text: z.string().trim().min(1).max(MAX_CHARS),
  lang: z.enum(TTS_LANGS),
});

const MURF_ERRORS: Record<number, string> = {
  400: "Murf could not read this voice or text.",
  402: "Murf credits are used up for this month.",
  403: "The Murf key is wrong or expired.",
  429: "Murf is busy. Try again in a few seconds.",
};

async function handler(req: Request) {
  if (process.env.PAID_VOICE !== "1")
    return Response.json({ error: "Paid voice (Murf) is off. The free in-browser voice is used instead." }, { status: 503 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return Response.json({ error: `Send text (1 to ${MAX_CHARS} characters) and lang: te-IN, hi-IN or en-IN.` }, { status: 400 });

  const { lang } = body.data;
  const text = body.data.text.replace(/\s+/g, " ");
  const voice = VOICES[lang];
  const file = path.join(CACHE_DIR, createHash("sha256").update(`falcon-2.1|${voice.voiceId}|${lang}|${text}`).digest("hex") + ".mp3");
  const t0 = Date.now();

  // Same line, same voice: play the saved audio, no Murf call.
  const cached = await readFile(file).catch(() => null);
  if (cached) return audio(new Uint8Array(cached), Date.now() - t0, "hit");

  // Bring your own key: the user's Murf key comes only with their own request. Never logged or stored.
  const userKey = req.headers.get("x-user-key")?.trim() || undefined;
  const key = userKey ?? process.env.MURF_AI_API_KEY;
  // No fallback voice provider yet: the UI shows this error and keeps the text reply.
  if (!key) return Response.json({ error: "Voice is off: no Murf key is set. Text replies still work." }, { status: 503 });
  if (!userKey && callsLeft() <= 0) return Response.json({ error: "Voice preview limit reached for today" }, { status: 429 });

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15_000); // no audio within 15 s: give up
  try {
    const res = await fetch(MURF_URL, {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId: voice.voiceId, locale: lang, model: "falcon-2.1", format: "MP3" }),
      signal: abort.signal,
    });
    if (!res.ok || !res.body)
      return Response.json({ error: MURF_ERRORS[res.status] ?? `Murf is down right now (${res.status}).` }, { status: 502 });
    if (!userKey) today.calls++;

    // Wait for the first audio byte, so x-ttfb-ms is the real time to first byte. Then stream the rest.
    const reader = res.body.getReader();
    const first = await reader.read();
    if (!first.value) return Response.json({ error: "Murf sent no audio. Try again." }, { status: 502 });
    return audio(relay(reader, first.value, file), Date.now() - t0, "miss");
  } catch {
    return Response.json({ error: "Murf did not answer. Try again." }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}

function audio(body: BodyInit, ttfb: number, cache: "hit" | "miss") {
  return new Response(body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "x-ttfb-ms": String(ttfb),
      "x-tts-cache": cache,
      "x-tts-left": String(Math.max(0, callsLeft())),
    },
  });
}

// Pass Murf's audio straight to the browser and save a copy once it is complete.
function relay(reader: ReadableStreamDefaultReader<Uint8Array>, first: Uint8Array, file: string) {
  const parts = [first];
  return new ReadableStream<Uint8Array>({
    start: (c) => c.enqueue(first),
    async pull(c) {
      const { done, value } = await reader.read();
      if (!done) {
        parts.push(value);
        c.enqueue(value);
        return;
      }
      await mkdir(CACHE_DIR, { recursive: true })
        .then(() => writeFile(file, Buffer.concat(parts)))
        .catch(() => {});
      c.close();
    },
    cancel: (why) => reader.cancel(why),
  });
}

export const POST = logged("tts", handler);
