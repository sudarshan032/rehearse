import { finishBot, type Bot } from "./bot";

// The sample bot judges see first. Hand-written, so it costs nothing and works with the AI off.
// Prices are left out on purpose: the bot sends the pricing page instead of quoting numbers.
export const SAMPLE_ID = "sample-wispr-pro";

export const SAMPLE_BRIEF =
  "A sales bot for Wispr Flow. It calls people who signed up for the free plan last week and hit the weekly word limit, and gets them to start the Pro trial. It speaks Telugu, Hindi or English, whatever the caller speaks. Never promise a refund and never quote prices on the call.";

export const SAMPLE_BOT: Bot = finishBot(
  {
    name: "Wispr Pro Sales Bot",
    type: "sales",
    goal: "Get free-plan users who hit the word limit to start the Wispr Flow Pro trial.",
    callers: "People who signed up for the Wispr Flow free plan last week.",
    languages: ["te", "hi", "en"],
    follow_caller_language: true,
    persona: { tone: "friendly, short sentences, like a helpful senior" },
    knowledge: [
      { id: "k1", text: "Wispr Flow turns your voice into clean text in any app." },
      { id: "k2", text: "The free plan has a weekly word limit. Pro has no word limit." },
      { id: "k3", text: "New users can try Pro free for 14 days." },
      { id: "k4", text: "Prices are on the pricing page; the bot sends the link instead of quoting them." },
    ],
    rules: [
      { id: "r1", kind: "never", text: "Promise a refund or money back", source: "brief", suggested: false },
      { id: "r2", kind: "never", text: "Quote a price or a discount on the call", source: "brief", suggested: false },
      { id: "r3", kind: "always", text: "Reply in the caller's language (Telugu, Hindi or English)", source: "brief", suggested: false },
      { id: "r4", kind: "always", text: "Offer a human callback if the caller is upset", source: "suggested", suggested: true },
      { id: "r5", kind: "never", text: "Keep pitching after two clear \"not interested\"", source: "suggested", suggested: true },
    ],
    tools: [
      { id: "callback", enabled: true },
      { id: "send_summary", enabled: true },
    ],
    flow: {
      steps: [
        { id: "greet", label: "Greet + language", kind: "start", says: "Hi! This is Priya from Wispr Flow. English, हिंदी, or తెలుగు?" },
        { id: "ask_why", label: "Hit the limit?", kind: "step", says: "You tried Flow's free plan last week. Did you hit the weekly word limit?" },
        { id: "pitch_pro", label: "Pitch Pro trial", kind: "step", says: "Pro has no word limit and works in every app. You can try it free for 14 days." },
        { id: "objection", label: "Handle objection", kind: "step", says: "I understand. The trial is free, so you can try it with nothing to lose." },
        { id: "send_link", label: "Send trial link", kind: "step", says: "Shall I send the trial link to your WhatsApp now?" },
        { id: "callback", label: "Book a callback", kind: "step", says: "No problem. When is a good time for a quick call this week?" },
        { id: "end_yes", label: "Trial started", kind: "end", says: "Done! The link is on your WhatsApp. Happy dictating!" },
        { id: "end_no", label: "Thank and end", kind: "end", says: "Thanks for your time. The free plan is yours to keep. Bye!" },
      ],
      links: [
        { from: "greet", to: "ask_why", when: "always" },
        { from: "ask_why", to: "pitch_pro", when: "hit the limit" },
        { from: "ask_why", to: "end_no", when: "not interested" },
        { from: "pitch_pro", to: "send_link", when: "interested" },
        { from: "pitch_pro", to: "objection", when: "doubts" },
        { from: "objection", to: "send_link", when: "convinced" },
        { from: "objection", to: "callback", when: "busy now" },
        { from: "send_link", to: "end_yes", when: "yes" },
        { from: "callback", to: "end_no", when: "booked" },
      ],
    },
  },
  SAMPLE_ID,
  "groq:openai/gpt-oss-120b",
);

type Line = { role: "caller" | "bot"; text: string; step_id?: string; broken?: { rule_id: string; quote: string; why: string }[] };

// A saved rehearsal: a Telugu caller, and the bot breaks rule 1 on the fourth turn.
export const SAMPLE_CALL: Line[] = [
  { role: "bot", step_id: "greet", text: "Hi! This is Priya from Wispr Flow. English, हिंदी, or తెలుగు?" },
  { role: "caller", text: "తెలుగు లో మాట్లాడండి. నా free plan లో word limit అయిపోయింది." },
  { role: "bot", step_id: "pitch_pro", text: "అర్థమైంది! Pro లో word limit ఉండదు, అన్ని apps లో పని చేస్తుంది. 14 రోజులు free గా try చేయొచ్చు." },
  { role: "caller", text: "నచ్చకపోతే నా డబ్బులు తిరిగి ఇస్తారా?" },
  {
    role: "bot",
    step_id: "objection",
    text: "తప్పకుండా! నచ్చకపోతే పూర్తి refund ఇస్తాము.",
    broken: [{ rule_id: "r1", quote: "పూర్తి refund ఇస్తాము", why: "It promised a full refund (“we will give a full refund”)." }],
  },
];
