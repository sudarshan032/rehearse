import { z } from "zod";
import { BotIn, Target, editBot, failEdit, readJSON } from "@/lib/edit";
import { logged } from "@/lib/devlog";

const Body = z.object({
  bot: BotIn,
  target: Target.nullish(),
  instruction: z.string().trim().min(2).max(2000),
});

async function handler(req: Request) {
  const body = Body.safeParse(await readJSON(req));
  if (!body.success) {
    const botBad = body.error.issues.some((i) => i.path[0] === "bot");
    return Response.json({ error: botBad ? "The bot data looks broken. Reload the page and try again." : "Say what to change." }, { status: 400 });
  }
  try {
    const { bot, target, instruction } = body.data;
    return Response.json(await editBot(bot, instruction, target ?? undefined));
  } catch (e) {
    return failEdit(e);
  }
}

export const POST = logged("edit", handler);
