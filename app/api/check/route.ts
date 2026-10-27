import { z } from "zod";
import { askJSON } from "@/lib/llm";
import { keywordCheck } from "@/lib/rule-check";
import { CHECK_SYSTEM, checkUser } from "@/lib/prompts-rehearse";
import { logged } from "@/lib/devlog";

const Body = z.object({
  rules: z.array(z.object({ id: z.string().min(1).max(40), kind: z.enum(["never", "always"]), text: z.string().max(300) })).max(24),
  reply: z.string().trim().min(1).max(2000),
  caller: z.string().trim().max(1000).default(""),
  knowledge: z.array(z.object({ text: z.string().max(400) })).max(30).default([]),
});

const Verdicts = z.object({
  results: z
    .array(
      z.object({
        rule_id: z.coerce.string(),
        broken: z.unknown().optional().transform((v) => v === true || v === "true" || v === "yes"),
        quote: z.string().catch(""),
        why: z.string().catch(""),
      }),
    )
    .max(30),
});

async function handler(req: Request) {
  const t0 = Date.now();
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Send the bot's rules and one reply to check." }, { status: 400 });
  const { rules, reply, caller, knowledge } = body.data;

  const { broken, unsure } = keywordCheck(rules, reply, caller);
  if (!unsure.length) return Response.json({ broken, ms: Date.now() - t0, method: "keywords" });

  const ask = rules.filter((r) => unsure.includes(r.id));
  try {
    const { data } = await askJSON(CHECK_SYSTEM, checkUser(ask, reply, caller, knowledge.map((k) => k.text)), Verdicts);
    const said = reply.normalize("NFC").toLowerCase();
    for (const v of data.results) {
      if (!v.broken || !ask.some((r) => r.id === v.rule_id) || broken.some((b) => b.rule_id === v.rule_id)) continue;
      const quote = v.quote.replace(/^["'“”‘’…\s]+|["'“”‘’…\s]+$/g, "");
      broken.push({
        rule_id: v.rule_id,
        quote: quote && said.includes(quote.normalize("NFC").toLowerCase()) ? quote : reply.slice(0, 160),
        why: v.why || "This reply breaks the rule.",
      });
    }
    const order = (id: string) => rules.findIndex((r) => r.id === id);
    broken.sort((a, b) => order(a.rule_id) - order(b.rule_id));
    return Response.json({ broken, ms: Date.now() - t0, method: "llm" });
  } catch {
    // AI busy or off: the keyword result still stands, labelled honestly.
    return Response.json({ broken, ms: Date.now() - t0, method: "keywords", ai_off: true });
  }
}

export const POST = logged("check", handler);
