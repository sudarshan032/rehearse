import { z } from "zod";
import { fail } from "@/lib/llm";
import { chatJSON, type Msg } from "@/lib/llm-fast";
import { CALL_START, CALLER_SILENT, LANG_HINT } from "@/lib/prompts-rehearse";
import { logged } from "@/lib/devlog";

const Line = z.object({
  role: z.enum(["caller", "bot"]),
  text: z.string().trim().max(1000),
  step_id: z.string().max(40).optional(),
});

const Body = z.object({
  bot: z.object({
    prompt: z.string().min(20).max(20000),
    languages: z.array(z.string().max(10)).max(5).default([]),
    follow_caller_language: z.boolean().default(true),
    flow: z.object({ steps: z.array(z.object({ id: z.string().max(40) })).min(1).max(20) }),
  }),
  history: z.array(Line).max(60).default([]),
  text: z.string().trim().max(1000).default(""),
});

const Reply = z.object({
  reply: z.string().trim().min(1).max(2000),
  step_id: z.unknown().optional().transform((v) => String(v ?? "").replace(/[[\]\s]/g, "")),
  ended: z.unknown().optional().transform((v) => v === true || v === "true"),
});

// It is speech: at most 300 characters (the voice cap), cut at the end of a sentence.
function short(s: string) {
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= 300) return s;
  const cut = s.slice(0, 300);
  const end = Math.max(...[". ", "? ", "! ", "। "].map((p) => cut.lastIndexOf(p)));
  return end > 40 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

async function handler(req: Request) {
  const t0 = Date.now();
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "The call data is missing or too long." }, { status: 400 });
  const { bot, history, text } = body.data;

  // The caller's new words, unless the history already ends with them.
  const prev = history.at(-1);
  const lines: z.infer<typeof Line>[] =
    text && !(prev?.role === "caller" && prev.text === text) ? [...history, { role: "caller", text }] : history;
  const messages: Msg[] = [
    { role: "system", content: bot.prompt },
    ...lines.slice(-20).map((l): Msg =>
      l.role === "caller"
        ? { role: "user", content: l.text }
        : { role: "assistant", content: JSON.stringify({ reply: l.text, step_id: l.step_id }) },
    ),
  ];
  const end = lines.at(-1);
  if (end?.role !== "caller") messages.push({ role: "user", content: lines.length ? CALLER_SILENT : CALL_START });
  else {
    // The script most of the line is written in (a stray word in another script doesn't switch the call).
    const n = (re: RegExp) => end.text.match(re)?.length ?? 0;
    const [te, hi, en] = [n(/[\u0C00-\u0C7F]/g), n(/[\u0900-\u097F]/g), n(/[a-z]/gi)];
    // Both Indian scripts in one line is a mis-heard line: stay in the language the bot was already speaking.
    const was = [...lines].reverse().find((l) => l.role === "bot")?.text ?? "";
    const prev = /[\u0C00-\u0C7F]/.test(was) ? "te" : /[\u0900-\u097F]/.test(was) ? "hi" : "";
    // A sound like "మ్.." (a heard "hmm") is too short to switch the call's language: it takes 3+ letters.
    const lang = te && hi && prev ? prev : te >= 3 && te > hi && te >= en ? "te" : hi >= 3 && hi > te && hi >= en ? "hi" : prev && !te && !hi && en >= 8 ? "en" : ""; // back to English after a Telugu/Hindi turn
    if (lang && bot.follow_caller_language && (!bot.languages.length || bot.languages.includes(lang)))
      messages[messages.length - 1].content += `\n\n${LANG_HINT[lang]}`;
  }

  try {
    let { data, llm } = await chatJSON(messages, Reply);
    // A lone "okay" or "hmm" is an answer, never a goodbye: if the model hung up on one, ask it once more.
    const bare = end?.role === "caller" && /^(ok(ay)?|hmm+|mm+|yes|yeah|sure|fine|right|సరే|హా|ఊ|ఓకే|ठीक है|हाँ|हां|अच्छा|ओके)[\s.!,।]*$/i.test(end.text.trim());
    if (data.ended && bare) {
      messages.push({ role: "assistant", content: JSON.stringify(data) }, { role: "user", content: "(Do not end the call: the caller only acknowledged. Answer as if they said yes to your last question, or ask what else they need.)" });
      ({ data, llm } = await chatJSON(messages, Reply).catch(() => ({ data: { ...data, ended: false }, llm })));
    }
    const ids = bot.flow.steps.map((s) => s.id);
    const last = lines.findLast((l) => l.role === "bot" && l.step_id && ids.includes(l.step_id))?.step_id ?? ids[0];
    const step_id = ids.find((id) => id.toLowerCase() === data.step_id.toLowerCase()) ?? last;
    return Response.json({ reply: short(data.reply), step_id, ended: data.ended && !bare, ms: Date.now() - t0, llm });
  } catch (e) {
    return fail(e);
  }
}

export const POST = logged("turn", handler);
