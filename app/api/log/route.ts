import { appendFile, mkdir } from "node:fs/promises";

// Dev only: the page reports input and focus events here so problems can be read from .cache/session.log.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  const line = (await req.text()).slice(0, 2000).replace(/\n/g, " ");
  await mkdir(".cache", { recursive: true });
  await appendFile(".cache/session.log", `${new Date().toISOString()} ${line}\n`);
  return new Response(null, { status: 204 });
}
