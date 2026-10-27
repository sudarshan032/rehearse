import { z } from "zod";

export const LANGS: Record<string, { name: string; voice: string }> = {
  te: { name: "Telugu", voice: "te-IN" },
  hi: { name: "Hindi", voice: "hi-IN" },
  en: { name: "English", voice: "en-IN" },
};

export const TOOL_SHELF: Record<string, string> = {
  callback: "Book a callback",
  transfer_human: "Transfer to a human",
  lookup_order: "Look up an order (sample data)",
  send_summary: "Send a summary by SMS/WhatsApp",
};

const id = z.string().min(1).max(40);
const text = (max: number) => z.string().trim().max(max);

export const Understood = z.object({
  goal: text(400),
  callers: text(300),
  languages: z.array(z.string()).max(3),
  knowledge: z.array(text(300)).max(12),
  never: z.array(text(200)).max(10),
  always: z.array(text(200)).max(10),
  tools: z.array(z.string()).max(4),
});

export const Interview = z.object({
  type: z.enum(["sales", "support", "personal", "other"]),
  name: text(60),
  questions: z
    .array(z.object({ id, q: text(220), hint: text(220).default("") }))
    .min(1)
    .max(6),
  understood: Understood,
});
export type Interview = z.infer<typeof Interview>;

// What the LLM returns for /api/blueprint. id, version, stack and prompt are added in code.
export const BotDraft = z.object({
  name: text(60),
  type: z.enum(["sales", "support", "personal", "other"]),
  goal: text(400),
  callers: text(300),
  languages: z.array(z.string()).min(1).max(3),
  follow_caller_language: z.boolean().default(true),
  persona: z.object({ tone: text(120) }),
  knowledge: z.array(z.object({ id, text: text(400) })).max(20),
  rules: z
    .array(
      z.object({
        id,
        kind: z.enum(["never", "always"]),
        text: text(200),
        source: text(40),
        suggested: z.boolean().default(false),
      }),
    )
    .max(16),
  tools: z.array(z.object({ id, enabled: z.boolean() })).max(4),
  flow: z.object({
    steps: z
      .array(
        z.object({
          id,
          label: text(40),
          says: text(400),
          kind: z.enum(["start", "step", "end"]).default("step"),
        }),
      )
      .min(3)
      .max(14),
    links: z.array(z.object({ from: id, to: id, when: text(60).default("always") })).max(32),
  }),
});

export type Bot = z.infer<typeof BotDraft> & {
  id: string;
  version: number;
  persona: { tone: string; voice: { provider: string; lang: string } };
  stack: { stt: string; llm: string; tts: string };
  prompt: string;
};

export function finishBot(draft: z.infer<typeof BotDraft>, id: string, llm: string, version = 1): Bot {
  const ids = new Set(draft.flow.steps.map((s) => s.id));
  const flow = { ...draft.flow, links: draft.flow.links.filter((l) => ids.has(l.from) && ids.has(l.to)) };
  const lang = draft.languages.find((l) => LANGS[l]) ?? "en";
  const bot: Bot = {
    ...draft,
    name: draft.name.replace(/_/g, " "),
    rules: draft.rules.map((r) => ({ ...r, text: r.text.replace(/^(never|always)\b[:,]?\s*/i, "").replace(/^./, (c) => c.toUpperCase()) })),
    flow,
    id,
    version,
    persona: { tone: draft.persona.tone, voice: { provider: "murf", lang: LANGS[lang].voice } },
    stack: { stt: "groq:whisper-large-v3-turbo", llm, tts: "browser" },
    prompt: "",
  };
  bot.prompt = compilePrompt(bot);
  return bot;
}

export const langName = (l: string) => LANGS[l]?.name ?? l;

// The runtime prompt is always generated from the fields, never edited separately.
// Small models translate the flow's English lines into bookish Telugu/Hindi that nobody says on a call.
// What real callers hear instead: everyday words, with the English words people actually use, in the same script.
const SPOKEN: Record<string, string> = {
  te: `Telugu: everyday spoken Telugu, like talking to a shop owner on the phone. Use the English words people really say, written in Telugu letters (ప్లాన్, ట్రయల్, లింక్, డెమో, వాట్సాప్, ట్రై చేయండి). Never bookish words.
  Bad: "మీరు గత వారం మా యాప్ ఉపయోగించారు. మీకు సహాయం అవసరమా?" Good: "మీరు లాస్ట్ వీక్ మా యాప్ వాడారు కదా. ఏమైనా హెల్ప్ కావాలా?"
  Bad: "14 రోజుల ఉచిత ట్రయల్ ప్రయత్నించాలనుకుంటున్నారా?" Good: "14 రోజులు ఫ్రీ ట్రయల్ ఉంది, ట్రై చేస్తారా?"`,
  hi: `Hindi: everyday spoken Hindi, the way people talk on the phone. Use the English words people really say, written in Devanagari (प्लान, ट्रायल, लिंक, डेमो, व्हाट्सऐप). Never formal words.
  Bad: "क्या आपको सहायता की आवश्यकता है?" Good: "कोई हेल्प चाहिए क्या?"
  Bad: "आप 14 दिन का परीक्षण आज़मा सकते हैं।" Good: "14 दिन का फ्री ट्रायल है, ट्राई करेंगे?"
  If your name is a woman's name, use feminine verbs: समझ गई, बता सकती हूँ, भेज देती हूँ.`,
};
const spoken = (langs: string[]) => {
  const parts = langs.filter((l) => SPOKEN[l]).map((l) => SPOKEN[l]);
  return parts.length ? `\nHow to speak (brand names like product names stay in English):\n${parts.join("\n")}` : "";
};

export function compilePrompt(b: Bot): string {
  const langs = b.languages.map(langName).join(", ");
  const out = (to: string) =>
    b.flow.links
      .filter((l) => l.from === to)
      .map((l) => `${l.to} (${l.when})`)
      .join(", ");
  const steps = b.flow.steps
    .map((s, i) => {
      const next = out(s.id);
      return `${i + 1}. [${s.id}] ${s.label}: say something like "${s.says}"${next ? `\n   next: ${next}` : ""}`;
    })
    .join("\n");
  const rules = (kind: string) =>
    b.rules
      .filter((r) => r.kind === kind)
      .map((r) => `- ${r.text}`)
      .join("\n") || "- (none)";
  const tools = b.tools
    .filter((t) => t.enabled)
    .map((t) => `- ${t.id}: ${TOOL_SHELF[t.id] ?? t.id}`)
    .join("\n");

  return `You are "${b.name}", a voice agent on a phone call.
Goal: ${b.goal}
You are talking to: ${b.callers}
Tone: ${b.persona.tone}
Languages: ${langs}. ${
    b.follow_caller_language
      ? "Always reply in the language the caller last used (Telugu, Hindi, English or a mix)."
      : `Always reply in ${langName(b.languages[0])}.`
  }
Speak like a person on the phone: one or two short sentences, no lists, no markdown, no emojis.
Numbers, prices and dates come only from the facts.${spoken(b.languages)}

## Call flow (follow it, one step at a time)
${steps}

## Facts you may use (never invent prices, dates or features)
${b.knowledge.map((k) => `- ${k.text}`).join("\n") || "- (none)"}

## Never
${rules("never")}

## Always
${rules("always")}
${tools ? `\n## Tools you can offer\n${tools}\n` : ""}
## Output
Return JSON only: {"reply": "<what you say>", "step_id": "<id of the flow step you are on>", "ended": <true if the call is over>}`;
}
