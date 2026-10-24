// Deepgram pre-recorded STT: https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded
// Send the MediaRecorder blob as the raw body, with its type as Content-Type (audio/webm, audio/mp4 on Safari).
const DG_URL = "https://api.deepgram.com/v1/listen";
const MAX_BYTES = 2 * 1024 * 1024; // about 30 s of hold-to-talk audio, with room to spare
const HINTS = new Set(["te", "hi", "en"]);

const tooBig = () => Response.json({ error: "That recording is too long. Keep each turn under 30 seconds." }, { status: 413 });

export async function POST(req: Request) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return Response.json({ error: "Voice input is off: no Deepgram key is set. Type your line instead." }, { status: 503 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return tooBig();

  const audio = await req.arrayBuffer().catch(() => null);
  if (!audio || audio.byteLength < 1000)
    return Response.json({ error: "No audio came through. Hold the button while you speak." }, { status: 400 });
  if (audio.byteLength > MAX_BYTES) return tooBig();

  const type = req.headers.get("content-type")?.split(";")[0] ?? "";
  const params = new URLSearchParams({ model: "nova-3", language: "multi", smart_format: "true" });
  // Optional ?langs=te,hi nudges Nova-3 towards the bot's languages. It can still hear the others.
  for (const l of new URL(req.url).searchParams.get("langs")?.split(",") ?? []) if (HINTS.has(l)) params.append("language_hint", l);

  const t0 = Date.now();
  try {
    const res = await fetch(`${DG_URL}?${params}`, {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": type.startsWith("audio/") ? type : "audio/webm" },
      body: audio,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return Response.json({ error: `Speech-to-text failed (Deepgram ${res.status}). Try again or type.` }, { status: 502 });
    const alt = (await res.json())?.results?.channels?.[0]?.alternatives?.[0];
    // languages[] is sorted by word count, so the first one is the main language of the turn.
    return Response.json({ text: alt?.transcript ?? "", ms: Date.now() - t0, lang: alt?.languages?.[0] });
  } catch {
    return Response.json({ error: "Deepgram did not answer. Try again or type." }, { status: 504 });
  }
}
