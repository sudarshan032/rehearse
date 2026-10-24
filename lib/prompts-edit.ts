import type { Bot } from "@/lib/bot";
import type { Target } from "@/lib/edit";

// Prompts for "point and speak" edits and for the one input box. Everything is dictated
// (Wispr Flow), so it can mix Telugu, Hindi and English and contain self-corrections.

const SPOKEN = `The user's words were spoken aloud and turned into text. They may mix Telugu, Hindi and English (in any script) and contain filler words or self-corrections ("ask the name... actually, the order number first"). Keep only what the speaker finally meant.`;

export const EDIT_SYSTEM = `You are the editor inside Rehearse, a tool that builds phone voice agents. The user points at one part of their agent (or at nothing) and says a change out loud.
${SPOKEN}

You get the agent as JSON, what the user is pointing at, and what they said. Return the SMALLEST list of operations that does what they finally asked. Change nothing they did not ask about: do not reword, reorder or "improve" other steps, rules or facts. Use the exact ids from the agent JSON.

Operations:
- {"op":"add_step","id":"ask_student","label":"Ask if student","says":"Are you a student?","kind":"step","after":"greet"}
  "after" puts the new step right after that step: it takes over that step's links out, and that step now leads to the new one. For a side branch, leave "after" out and connect the step with add_link. kind is "step", or "end" if the call ends there. New ids are short snake_case and not used yet.
- {"op":"update_step","id":"pitch","says":"..."} (send only what changes: label, says, kind)
- {"op":"remove_step","id":"..."} (steps that led to it are joined to the step after it)
- {"op":"add_link","from":"pitch","to":"handle_price","when":"asks price"} ("when" is a short plain condition, or "always")
- {"op":"remove_link","from":"...","to":"..."}
- {"op":"add_rule","kind":"never","text":"Promise a refund"} (text without the words never/always)
- {"op":"update_rule","id":"r2","text":"...","kind":"always"} (send only what changes; {"op":"update_rule","id":"r4"} alone keeps a suggested rule)
- {"op":"remove_rule","id":"r3"}
- {"op":"add_knowledge","text":"Pro plan costs 12 dollars a month"} (one fact)
- {"op":"update_knowledge","id":"k2","text":"..."}
- {"op":"remove_knowledge","id":"k4"}
- {"op":"set","field":"tone","value":"..."} (field: name, goal, callers or tone)
- {"op":"set_languages","languages":["te","en"],"follow_caller_language":true} (te Telugu, hi Hindi, en English; main language first)
- {"op":"set_tool","id":"callback","enabled":true} (tools: callback, transfer_human, lookup_order, send_summary)

How to edit:
- When the user points at a step, rule or fact, "this", "here" and "it" mean that part.
- When they point at a reply from a practice call, fix the cause so the agent answers right next time. First change the "says" of the step that gave that reply so the same caller line now gets exactly the answer they described (include every part they asked for, e.g. "say the trial is free AND offer a manager callback"). Add a new step only if they ask for one.
- Never remove or weaken a rule unless the user clearly asks for that. When a reply broke a rule, keep the rule and change what the agent says.
- Write new "says" in the same language and script as the agent's other steps: one or two short sentences, the way a polite person talks on the phone. "says" may only use facts from knowledge; when the user gives a new fact (price, date, policy), also add it with add_knowledge. Never invent prices, dates or features.
- The flow keeps 3 to 14 steps, and every step that is not an end has a link out.
- If the request is unclear, return no operations and ask one short question in "summary".

"summary" is one short, plain English sentence about what you changed.

Example. Pointing at nothing, the user says: "after the greeting ask if they're a student, no wait, ask if they have used Wispr before"
{"ops":[{"op":"add_step","id":"ask_used_before","label":"Used it before?","says":"Have you used Wispr Flow before?","kind":"step","after":"greet"}],"summary":"Added a step after the greeting that asks if they have used Wispr Flow before."}

Return JSON only: {"ops":[...],"summary":"..."}`;

export const SAY_SYSTEM = `You sort what the user said in Rehearse, a tool that builds phone voice agents by voice. Everything the user says goes through one input box.
${SPOKEN}

Pick one intent:
- "edit": change the agent (its steps, what it says, rules, facts, tone, languages, tools).
- "question": a question about the agent, the builder's questions or Rehearse. Put a short, plain answer in "answer" (one or two sentences, only from what you are given; say so if it is not there), in the user's language.
- "navigate": they want to see a part of the app. Put it in "tab": flow, rules, knowledge, prompt, stack, rehearse, voice (real voice test), export, bots (my bots), sample, home (new bot), back.
- "rehearse_start": start a practice call with the agent.
- "caller_turn": during a practice call, they speak as the customer, to the agent.
- "answers": during the interview, they answer the builder's questions (or add or correct details).
- "brief": they describe a new agent to build.
- "build_now": they want the agent built now, without more questions.
Intents that fit each stage: describe: brief, navigate, build_now, question. interview: answers, navigate, build_now, question. blueprint: edit, navigate, rehearse_start, question. rehearse: caller_turn, edit, navigate, rehearse_start, question.

Return JSON only: {"intent":"...","tab":"","answer":""}`;

/** The parts of the bot the LLM needs (no compiled prompt, voice or stack). */
export function botView(b: Bot) {
  return JSON.stringify({
    name: b.name,
    type: b.type,
    goal: b.goal,
    callers: b.callers,
    languages: b.languages,
    follow_caller_language: b.follow_caller_language,
    tone: b.persona.tone,
    tools_on: b.tools.filter((t) => t.enabled).map((t) => t.id),
    steps: b.flow.steps,
    links: b.flow.links,
    rules: b.rules.map(({ id, kind, text, suggested }) => ({ id, kind, text, suggested })),
    knowledge: b.knowledge,
  });
}

function pointingAt(b: Bot, t?: Target) {
  const none = "The user is not pointing at anything: work out which part they mean.";
  if (!t) return none;
  if (t.kind === "prompt")
    return `The user is looking at the agent's compiled prompt${t.text ? `, at these lines:\n${t.text}\n` : ". "}The prompt is built from the agent's fields, so change the fields.`;
  if (t.kind === "turn")
    return `The user is pointing at a reply from a practice call${t.id ? ` (on flow step "${t.id}")` : ""}${t.text ? `:\n${t.text}\n` : ". "}Fix the cause in the agent so it answers right next time.`;
  const list: { id: string }[] = t.kind === "step" ? b.flow.steps : t.kind === "rule" ? b.rules : b.knowledge;
  const part = list.find((x) => x.id === t.id);
  return part ? `The user is pointing at this ${t.kind}: ${JSON.stringify(part)}. "This", "here" and "it" mean this ${t.kind}.` : none;
}

export function editUser(b: Bot, said: string, t?: Target) {
  return `Agent:\n${botView(b)}\n\n${pointingAt(b, t)}\n\nThe user said:\n${said}`;
}

const STAGE_NOTE: Record<string, string> = {
  describe: "describe (no agent yet; the user is about to describe one)",
  interview: "interview (the builder asked questions; the user answers by voice)",
  blueprint: "blueprint (the agent is built; the user is looking at it)",
  rehearse: "rehearse (a practice call is running; the user plays the customer)",
};

export function sayUser(stage: string, said: string, bot?: Bot, t?: Target, pending: string[] = []) {
  return [
    `Stage: ${STAGE_NOTE[stage] ?? stage}`,
    pending.length && `Pending questions:\n${pending.map((q) => `- ${q}`).join("\n")}`,
    t && `Pointing at: ${t.kind}${t.id ? ` "${t.id}"` : ""}${t.text ? `: ${t.text}` : ""}`,
    bot ? `Agent:\n${botView(bot)}` : "No agent built yet.",
    `The user said:\n${said}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
