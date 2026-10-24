import type { Bot } from "./bot";

// Ready-to-paste starting points for other platforms. Field names follow their public docs;
// check them in the platform's dashboard before going live.
const first = (b: Bot) => b.flow.steps.find((s) => s.kind === "start")?.says ?? b.flow.steps[0]?.says ?? "";
const slug = (s: string) => s.replace(/\W+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "bot";

// Vapi assistant (POST /assistant): https://docs.vapi.ai/api-reference/assistants/create
export const toVapi = (b: Bot) => ({
  name: b.name,
  firstMessage: first(b),
  model: { provider: "groq", model: b.stack.llm.split(":").slice(1).join(":"), messages: [{ role: "system", content: b.prompt }] },
  transcriber: { provider: "deepgram", model: "nova-3", language: "multi" },
  voice: { provider: "playht", voiceId: "choose-a-voice" },
  endCallPhrases: ["Bye!", "Goodbye"],
});

// Retell LLM + agent (create-retell-llm, create-agent): https://docs.retellai.com/api-references
export const toRetell = (b: Bot) => ({
  llm: { general_prompt: b.prompt, begin_message: first(b) },
  agent: { agent_name: b.name, voice_id: "choose-a-voice", language: b.languages.includes("en") ? "en-IN" : "multi" },
});

// Pipecat: a short Python bot file that uses the same prompt.
export const toPipecat = (b: Bot) => `# ${b.name}: exported from Rehearse. Fill in your keys, then run with Pipecat.
# Pipecat docs: https://docs.pipecat.ai
SYSTEM_PROMPT = ${JSON.stringify(b.prompt)}
FIRST_MESSAGE = ${JSON.stringify(first(b))}
STACK = ${JSON.stringify(b.stack)}

messages = [{"role": "system", "content": SYSTEM_PROMPT}]
# Wire STT -> LLM -> TTS in your Pipecat pipeline and start the call with FIRST_MESSAGE.
`;

export const EXPORTS = [
  { id: "json", name: "Bot JSON", note: "flow, rules, facts, stack", file: (b: Bot) => [`${slug(b.name)}.json`, JSON.stringify(b, null, 2), "application/json"] },
  { id: "prompt", name: "Prompt", note: "Markdown, paste anywhere", file: (b: Bot) => [`${slug(b.name)}-prompt.md`, b.prompt, "text/markdown"] },
  { id: "vapi", name: "Vapi", note: "assistant JSON", file: (b: Bot) => [`${slug(b.name)}.vapi.json`, JSON.stringify(toVapi(b), null, 2), "application/json"] },
  { id: "retell", name: "Retell", note: "LLM + agent JSON", file: (b: Bot) => [`${slug(b.name)}.retell.json`, JSON.stringify(toRetell(b), null, 2), "application/json"] },
  { id: "pipecat", name: "Pipecat", note: "Python starter", file: (b: Bot) => [`${slug(b.name)}_pipecat.py`, toPipecat(b), "text/x-python"] },
] as const;
