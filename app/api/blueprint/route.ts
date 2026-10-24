import { z } from "zod";
import { BotDraft, finishBot } from "@/lib/bot";
import { askJSON, fail } from "@/lib/llm";
import { BLUEPRINT_SYSTEM, blueprintUser } from "@/lib/prompts";

const Body = z.object({
  id: z.string().max(40),
  brief: z.string().trim().min(10).max(4000),
  answers: z.array(z.object({ id: z.string().max(20), q: z.string().max(300), a: z.string().max(2000) })).max(12),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "The brief is missing." }, { status: 400 });
  try {
    const { data, llm, ms } = await askJSON(BLUEPRINT_SYSTEM, blueprintUser(body.data.brief, body.data.answers), BotDraft);
    return Response.json({ bot: finishBot(data, body.data.id, llm), ms });
  } catch (e) {
    return fail(e);
  }
}
