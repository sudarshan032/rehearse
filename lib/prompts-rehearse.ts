import type { Bot } from "./bot";

// Rehearsal prompts. The bot's own call prompt is compiled from its fields in lib/bot.ts (compilePrompt).

export const CALL_START = "(The call has just connected. The caller has not said anything yet.)";
export const CALLER_SILENT = "(The caller says nothing.)";

// Small fast models drift back to the language of the flow's example lines, so the newest caller line names its language.
export const LANG_HINT: Record<string, string> = {
  te: "(The caller is speaking Telugu. Reply in everyday spoken Telugu, in Telugu script, like talking to a shop owner on the phone. Use the English words people really say (ప్లాన్, ట్రయల్, లింక్, డెమో, వాట్సాప్), written in Telugu letters, not bookish Telugu words: say ట్రై చేశారు, వాడారు, కావాలా, ఓకే నా, not ప్రయత్నించారు, ఉపయోగించారు, ఆసక్తి ఉందా. Brand names stay in English.)",
  en: "(The caller is speaking English now. Reply in simple spoken English, even if earlier turns were in another language.)",
  hi: "(The caller is speaking Hindi. Reply in everyday spoken Hindi, in Devanagari, the way people talk on the phone. Use the English words people really say (प्लान, ट्रायल, लिंक, डेमो, व्हाट्सऐप), written in Devanagari, not formal Hindi words: say ट्राई किया, यूज़ किया, चाहिए क्या, not प्रयास, उपयोग, सीमा. Brand names stay in English.)",
};

export const CHECK_SYSTEM = `You check one reply of a phone voice agent against its rules, strictly, one rule at a time.
The reply and the caller's words may be in Telugu, Hindi or English, in any script, or mixed (Hinglish, Tenglish).

For each rule answer yes or no: does THIS reply break it?
- A "never" rule is broken only if the reply itself does that thing: makes the promise, gives the offer, makes the claim, shares the data. Mentioning the topic to refuse it, explain it or check it is not breaking it ("I can't promise a refund, I'll raise a request" is fine).
- An "always" rule is broken only if this reply clearly goes against it right now. If the rule is about another moment of the call, or you would need earlier turns to judge, it is not broken.
- If facts are given, a price, date, discount or feature in the reply that is not in the facts counts as made up.
- When in doubt, it is not broken.

For each broken rule, "quote" is the exact breaking words copied from the reply in their original script (not translated), and "why" is one short, plain English sentence.
Return JSON only, one item per rule: {"results":[{"rule_id":"r1","broken":false},{"rule_id":"r2","broken":true,"quote":"...","why":"..."}]}`;

export function checkUser(rules: Pick<Bot["rules"][number], "id" | "kind" | "text">[], reply: string, caller: string, facts: string[]) {
  return [
    caller && `The caller said: ${JSON.stringify(caller)}`,
    `The agent replied: ${JSON.stringify(reply)}`,
    facts.length && `Facts the agent may use:\n${facts.map((f) => `- ${f}`).join("\n")}`,
    `Rules to check:\n${rules.map((r) => `- ${r.id}: ${r.kind.toUpperCase()} ${r.text}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
