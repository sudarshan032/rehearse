import type { Bot } from "./bot";

// Honest hand-over to other platforms. Vapi and Retell have no "import a file" button in their dashboards
// (checked in their docs, Oct 2026): you either paste the prompt, or create the bot through their API.
// So every export says exactly how to use it, and the API ones come with a ready curl command.
const first = (b: Bot) => b.flow.steps.find((s) => s.kind === "start")?.says ?? b.flow.steps[0]?.says ?? "";
const slug = (s: string) => s.replace(/\W+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "bot";
const json = (o: unknown) => JSON.stringify(o, null, 2);

// Vapi: POST https://api.vapi.ai/assistant  https://docs.vapi.ai/api-reference/assistants/create
export const toVapi = (b: Bot) => ({
  name: b.name.slice(0, 40),
  firstMessage: first(b),
  model: { provider: "openai", model: "gpt-4o-mini", messages: [{ role: "system", content: b.prompt }] },
  transcriber: { provider: "deepgram", model: "nova-3", language: "multi" },
});

// Retell: create-retell-llm, then create-agent with its llm_id.  https://docs.retellai.com/api-references/create-retell-llm
export const toRetellLlm = (b: Bot) => ({ general_prompt: b.prompt, begin_message: first(b) });

export const toPipecat = (b: Bot) => `# ${b.name}: exported from Rehearse. Fill in your keys, then run with Pipecat.
# Pipecat docs: https://docs.pipecat.ai
SYSTEM_PROMPT = ${JSON.stringify(b.prompt)}
FIRST_MESSAGE = ${JSON.stringify(first(b))}
STACK = ${JSON.stringify(b.stack)}

messages = [{"role": "system", "content": SYSTEM_PROMPT}]
# Wire STT -> LLM -> TTS in your Pipecat pipeline and start the call with FIRST_MESSAGE.
`;

export type Export = {
  id: string;
  name: string;
  how: string; // one line: where it goes and what to do
  copy?: (b: Bot) => string; // what "Copy" puts on the clipboard
  copyLabel?: string;
  file?: (b: Bot) => [string, string, string]; // [file name, text, type] for "Download"
};

export const EXPORTS: Export[] = [
  {
    id: "prompt",
    name: "Prompt + first line",
    how: "Works anywhere. Paste into Vapi (Assistant → System prompt), Retell (Single prompt agent), ElevenLabs or your own code.",
    copy: (b) => `${b.prompt}\n\nFIRST MESSAGE: ${first(b)}`,
    copyLabel: "Copy prompt",
    file: (b) => [`${slug(b.name)}-prompt.md`, `${b.prompt}\n\nFIRST MESSAGE: ${first(b)}\n`, "text/markdown"],
  },
  {
    id: "vapi",
    name: "Vapi (API)",
    how: "Creates the assistant in your Vapi account. Download the file, then run the copied command with your Vapi key.",
    copy: (b) => `curl https://api.vapi.ai/assistant \\\n  -H "Authorization: Bearer $VAPI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d @${slug(b.name)}.vapi.json`,
    copyLabel: "Copy command",
    file: (b) => [`${slug(b.name)}.vapi.json`, json(toVapi(b)), "application/json"],
  },
  {
    id: "retell",
    name: "Retell (API)",
    how: "Two calls: create the LLM, then an agent that uses it. Download the file, then run the copied commands with your Retell key.",
    copy: (b) => `LLM_ID=$(curl -s https://api.retellai.com/create-retell-llm \\
  -H "Authorization: Bearer $RETELL_API_KEY" -H "Content-Type: application/json" \\
  -d @${slug(b.name)}.retell-llm.json | jq -r .llm_id)
curl https://api.retellai.com/create-agent \\
  -H "Authorization: Bearer $RETELL_API_KEY" -H "Content-Type: application/json" \\
  -d "$(jq -n --arg id "$LLM_ID" --arg name '${b.name.replace(/'/g, "")}' '{agent_name:$name,response_engine:{type:"retell-llm",llm_id:$id},voice_id:"11labs-Adrian"}')"`,
    copyLabel: "Copy commands",
    file: (b) => [`${slug(b.name)}.retell-llm.json`, json(toRetellLlm(b)), "application/json"],
  },
  {
    id: "pipecat",
    name: "Pipecat (Python)",
    how: "A starter file for your own open-source pipeline.",
    file: (b) => [`${slug(b.name)}_pipecat.py`, toPipecat(b), "text/x-python"],
  },
  {
    id: "json",
    name: "Full backup",
    how: "Everything in one file: flow, rules, facts, prompt and versions.",
    file: (b) => [`${slug(b.name)}.json`, json(b), "application/json"],
  },
];
