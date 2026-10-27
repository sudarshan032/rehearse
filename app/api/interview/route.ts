import { z } from "zod";
import { Interview } from "@/lib/bot";
import { askJSON, fail } from "@/lib/llm";
import { INTERVIEW_SYSTEM, interviewUser } from "@/lib/prompts";
import { logged } from "@/lib/devlog";

const Body = z.object({
  brief: z.string().trim().min(10).max(4000),
  answers: z.array(z.object({ q: z.string().max(300), a: z.string().max(2000) })).max(12).default([]),
});

async function handler(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Say a bit more about the bot (at least a sentence)." }, { status: 400 });
  try {
    const { data, llm, ms } = await askJSON(INTERVIEW_SYSTEM, interviewUser(body.data.brief, body.data.answers), Interview);
    return Response.json({ interview: data, llm, ms });
  } catch (e) {
    return fail(e);
  }
}

export const POST = logged("interview", handler);
