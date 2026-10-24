import { z } from "zod";
import { BotIn, Target, editBot, failEdit, readJSON } from "@/lib/edit";
import { askJSON, LLMError } from "@/lib/llm";
import { SAY_SYSTEM, sayUser } from "@/lib/prompts-edit";
import { ALLOWED, INTENTS, STAGES, STAGE_DEFAULT, TABS, guessIntent, personaOf, wantsBuild, type Guess } from "@/lib/say";

const Body = z.object({
  stage: z.enum(STAGES),
  text: z.string().trim().min(1).max(4000),
  bot: BotIn.nullish(),
  selection: Target.nullish(),
  pendingQuestions: z.array(z.string().max(300)).max(12).nullish(),
});

// What the LLM returns when the keywords were not enough.
const Routed = z.object({
  intent: z.enum(INTENTS),
  tab: z.enum(TABS).optional().catch(undefined),
  answer: z.string().trim().max(400).optional().catch(undefined),
});

export async function POST(req: Request) {
  const t0 = Date.now();
  const body = Body.safeParse(await readJSON(req));
  if (!body.success) return Response.json({ error: "I didn't catch that. Please say it again." }, { status: 400 });
  const { stage, text } = body.data;
  const bot = body.data.bot ?? undefined;
  const selection = body.data.selection ?? undefined;
  let g: Guess | null = guessIntent(stage, text, !!selection);
  let via = "rules";
  try {
    if (!g || g.intent === "question") {
      try {
        const { data } = await askJSON(SAY_SYSTEM, sayUser(stage, text, bot, selection, body.data.pendingQuestions ?? []), Routed);
        const fits = ALLOWED[stage].includes(data.intent) && (data.intent !== "navigate" || !!data.tab);
        g = fits ? data : { intent: STAGE_DEFAULT[stage] };
        via = "llm";
      } catch (e) {
        // AI is off or busy: fall back to what this stage usually means, when that needs no AI.
        if (!(e instanceof LLMError) || g || STAGE_DEFAULT[stage] === "edit") throw e;
        g = { intent: STAGE_DEFAULT[stage] };
      }
    }
    const ms = () => Date.now() - t0;
    if (g.intent === "edit") {
      if (!bot) return Response.json({ intent: "question", answer: "Build the bot first, then tell me what to change.", via, ms: ms() });
      return Response.json({ intent: "edit", ...(await editBot(bot, text, selection)), via, ms: ms() });
    }
    const said = g.intent === "brief" || g.intent === "answers" || g.intent === "caller_turn";
    return Response.json({
      intent: g.intent,
      tab: g.intent === "navigate" ? g.tab : undefined,
      answer: g.intent === "question" ? g.answer || "I couldn't find that in this bot." : undefined,
      text: said ? text : undefined,
      build: (g.intent === "brief" || g.intent === "answers") && wantsBuild(text) ? true : undefined,
      persona: g.intent === "rehearse_start" ? personaOf(text) : undefined,
      via,
      ms: ms(),
    });
  } catch (e) {
    return failEdit(e);
  }
}
