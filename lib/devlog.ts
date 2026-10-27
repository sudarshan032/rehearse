import { appendFile, mkdir } from "node:fs/promises";

// Dev only: every API call, every AI call and every crash goes to .cache/session.log, next to the page's own events,
// so a whole session can be read back in one file. Off in production.
const dev = process.env.NODE_ENV !== "production";

export async function devlog(ev: string, data: Record<string, unknown>) {
  if (!dev) return;
  try {
    await mkdir(".cache", { recursive: true });
    await appendFile(".cache/session.log", `${new Date().toISOString()} ${JSON.stringify({ side: "server", ev, ...data })}\n`);
  } catch {}
}

// A bot is sent with every call; its name and version are enough in the log (the full prompt is in the browser).
function brief(text: string) {
  try {
    // Never a key: a user's own Murf key can come in a request body.
    const j = JSON.parse(text, (k, v) => (/key|token|secret|password|auth/i.test(k) && typeof v === "string" ? "[hidden]" : v));
    if (j?.bot?.prompt) j.bot = `${j.bot.name ?? "bot"} v${j.bot.version ?? "?"}`;
    if (Array.isArray(j?.history)) j.history = `${j.history.length} lines`;
    return JSON.stringify(j).slice(0, 1500);
  } catch {
    return text.slice(0, 300).replace(/(key|token|secret)[^,}]*/gi, "$1 [hidden]");
  }
}

/** Wraps a route handler: logs what came in, what went out, the status and how long it took. */
export function logged(name: string, handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (!dev) return handler(req);
    const t0 = Date.now();
    const type = req.headers.get("content-type") ?? "";
    const query = new URL(req.url).search;
    const input = type.includes("json") ? brief(await req.clone().text()) : `${type || "no type"}, ${req.headers.get("content-length") ?? "?"} bytes`;
    try {
      const res = await handler(req);
      const out = res.headers.get("content-type")?.includes("json") ? brief(await res.clone().text()) : `${res.headers.get("content-type")}, ${res.headers.get("content-length") ?? "?"} bytes`;
      void devlog(res.ok ? "api" : "api-error", { name, status: res.status, ms: Date.now() - t0, query: query || undefined, in: input, out });
      return res;
    } catch (e) {
      void devlog("api-crash", { name, ms: Date.now() - t0, query: query || undefined, in: input, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e), stack: e instanceof Error ? e.stack?.split("\n").slice(0, 4).join(" | ") : undefined });
      throw e;
    }
  };
}
