import type { z } from "zod";
import { LLMError } from "@/lib/llm";

export type Msg = { role: "system" | "user" | "assistant"; content: string };

// Rehearsal turns need speed: a small Groq model first, OpenRouter free as fallback. Free tiers only.
const PROVIDERS = [
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: () => process.env.GROQ_API_KEY,
    model: () => process.env.GROQ_FAST_MODEL ?? "openai/gpt-oss-120b",
  },
  { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: () => process.env.GROQ_API_KEY, model: () => "qwen/qwen3.8-27b" },
  { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: () => process.env.GROQ_API_KEY, model: () => "openai/gpt-oss-20b" },
  {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL ?? "google/gemma-4-31b-it:free",
  },
];

/** Chat (with history) that must answer JSON matching the schema. Bad JSON: retry once; busy or slow: next provider. */
export async function chatJSON<T extends z.ZodType>(messages: Msg[], schema: T): Promise<{ data: z.infer<T>; llm: string }> {
  const errs: string[] = [];
  for (const p of PROVIDERS) {
    const key = p.key();
    if (!key) continue;
    const model = p.model();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(p.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "User-Agent": "rehearse/0.1" },
          body: JSON.stringify({
            model,
            messages,
            response_format: { type: "json_object" },
            temperature: 0.4,
            ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          errs.push(`${p.name} answered ${res.status}`);
          if (res.status === 400) continue; // Groq says 400 when the model's JSON was bad: try once more
          break;
        }
        const body = await res.json();
        const content = body.choices?.[0]?.message?.content ?? "";
        const parsed = schema.safeParse(JSON.parse(content));
        if (parsed.success) return { data: parsed.data, llm: `${p.name}:${model}` };
        if (process.env.NODE_ENV !== "production") console.warn("[turn] wrong shape:", content.slice(0, 300));
        errs.push(`${p.name} returned the wrong shape`);
      } catch (e) {
        errs.push(`${p.name}: ${e instanceof Error ? e.name : "error"}`);
        if (e instanceof Error && e.name === "TimeoutError") break;
      }
    }
  }
  throw new LLMError(errs.join(", ") || "no AI provider key set");
}
