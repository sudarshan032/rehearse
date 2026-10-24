import type { z } from "zod";

// Free tiers only. Model names are config: change them in .env without touching code.
const PROVIDERS = [
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: () => process.env.GROQ_API_KEY,
    model: () => process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    extra: { reasoning_effort: "low" },
  },
  // Each Groq model has its own free rate limit, so a busy model falls through to the next one.
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: () => process.env.GROQ_API_KEY,
    model: () => "qwen/qwen3.8-27b",
    extra: {},
  },
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: () => process.env.GROQ_API_KEY,
    model: () => "openai/gpt-oss-20b",
    extra: { reasoning_effort: "low" },
  },
  {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL ?? "google/gemma-4-31b-it:free",
    extra: {},
  },
  {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: () => process.env.OPENROUTER_API_KEY,
    model: () => "nvidia/nemotron-3-super-120b-a12b:free",
    extra: {},
  },
];

export class LLMError extends Error {}

/** Ask for JSON, check it against the schema. Bad shape: retry once, then try the next provider. */
export async function askJSON<T extends z.ZodType>(
  system: string,
  user: string,
  schema: T,
): Promise<{ data: z.infer<T>; llm: string; ms: number }> {
  const errs: string[] = [];
  for (const p of PROVIDERS) {
    const key = p.key();
    if (!key) continue;
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now();
      try {
        const res = await fetch(p.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "User-Agent": "rehearse/0.1" },
          body: JSON.stringify({
            model: p.model(),
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
            temperature: 0.4,
            ...p.extra,
          }),
          signal: AbortSignal.timeout(60_000),
        });
        if (!res.ok) {
          errs.push(`${p.name} answered ${res.status}`);
          break; // rate limit or outage: go to the next provider
        }
        const body = await res.json();
        const parsed = schema.safeParse(JSON.parse(body.choices?.[0]?.message?.content ?? ""));
        if (parsed.success) return { data: parsed.data, llm: `${p.name}:${p.model()}`, ms: Date.now() - t0 };
        errs.push(`${p.name} returned the wrong shape`);
      } catch (e) {
        errs.push(`${p.name}: ${e instanceof Error ? e.name : "error"}`);
      }
    }
  }
  throw new LLMError(errs.join(", ") || "no AI provider key set");
}

export function fail(e: unknown) {
  const msg = e instanceof LLMError ? `The free AI is busy right now (${e.message}). Try again in a minute.` : "Something went wrong.";
  return Response.json({ error: msg }, { status: 503 });
}
