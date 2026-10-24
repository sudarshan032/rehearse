// Download the KittenTTS nano 0.8 (int8) model once, for the free in-browser voice (lib/speak.ts).
//   node scripts/get-kitten.mjs
// Saves into public/models/kitten/ (git-ignored, about 27 MB). Without it, the browser loads the same files
// straight from Hugging Face.
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const REPO = "https://huggingface.co/KittenML/kitten-tts-nano-0.8-int8/resolve/main/";
const FILES = ["kitten_tts_nano_v0_8.onnx", "voices.npz"];
const dir = path.join(process.cwd(), "public", "models", "kitten");

await mkdir(dir, { recursive: true });
for (const name of FILES) {
  const file = path.join(dir, name);
  if (await stat(file).then((s) => s.size > 0, () => false)) {
    console.log(`have ${name}`);
    continue;
  }
  const res = await fetch(REPO + name);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(file, buf);
  console.log(`got ${name} (${(buf.length / 1e6).toFixed(1)} MB)`);
}
