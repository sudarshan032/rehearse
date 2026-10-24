import type { Bot } from "./bot";

type Rule = Pick<Bot["rules"][number], "id" | "kind" | "text">;
export type Broken = { rule_id: string; quote: string; why: string };
type Verdict = "ok" | "unsure" | { quote: string; why: string };

const B = String.raw`(?<![\p{L}\p{M}\p{N}])`;
const E = String.raw`(?![\p{L}\p{M}])`;

// Word lists for any script. Telugu words carry their endings (రిఫండ్‌ను), so they match anywhere.
// Other words must start a word; a trailing ">" means the word must end there too.
function words(list: string[], flags = "iu") {
  const alts = list.map((w) => {
    const core = w.endsWith(">") ? `(?:${w.slice(0, -1)})${E}` : `(?:${w})`;
    return /^[ఀ-౿]/.test(w) ? core : B + core;
  });
  return new RegExp(alts.join("|").normalize("NFC"), flags);
}

// "No" or a hedge in the same clause: the reply may be refusing or only checking, so the AI decides.
const SOFT = words([
  "not>", "no>", "never>", "cannot", "unable", "[a-z]+n['’]t>", "check", "see if", "try", "possible", "maybe", "might>",
  "may>", "could>", "depend", "eligible", "policy", "if>", "once>", "unless",
  "nahi", "nahin", "nai>", "mat>", "shayad", "ho sakt", "agar", "dekh",
  "नहीं", "नही>", "मत>", "शायद", "देख", "चेक", "हो सकत", "अगर",
  "ledu", "kaadu", "kadu>", "raadu", "kudaradu", "vaddu", "emo>",
  "లేదు", "కాదు", "రాదు", "కుదరదు", "లేము", "లేను", "లేరు", "వద్దు", "చూస్తా", "చెక్", "కావచ్చు", "ఏమో", "అయితే",
]);

const GUARANTEE = ["guarantee", "sure.?shot", "100 ?% (?:sure|guarantee|result)", "hundred percent (?:sure|guarantee|result)", "गारंटी", "ग्यारंटी", "గ్యారంటీ", "గ్యారెంటీ"];
const FREE = ["free>", "no cost", "free of cost", "मुफ्त", "मुफ़्त", "फ्री", "ఉచిత", "ఫ్రీ"];

// What a "never" rule can be about. rule: words that put a rule on the topic. hit: words in a reply that touch it.
// breaks: words that settle it as broken. Dates and prices have no "breaks": only the AI can tell if they were promised or made up.
const TOPICS: { rule: RegExp; hit: RegExp; breaks?: RegExp }[] = [
  {
    rule: words(["refund", "money.?back", "रिफंड", "रीफंड", "पैसे वापस", "రిఫండ్", "వాపస్"]),
    hit: words(["refund", "money.?back", "रिफंड", "रीफंड", "पैस[ेा] वापस", "pais[ae] (?:wapas|vapas)", "రిఫండ్", "వాపస్", "డబ్బు\\S* తిరిగి"], "giu"),
    breaks: words([
      "full refund", "100 ?% refund", "money.?back guarantee", "p(?:u|oo)ra refund", "be refunded",
      "(?:you|we|i)(?:['’]ll| will| can) (?:get|give|receive|process|issue)(?: you)? (?:a |an |the |your |full )?(?:refund|money.?back)",
      "refund (?:is|will be) (?:guaranteed|confirmed|approved)", "refund (?:mil|de)", "pais[ae] (?:wapas|vapas) (?:mil|de|kar)",
      "पूरा रिफंड", "पूरे पैसे वापस", "रिफंड (?:मिल|दे)", "पैस[ेा] वापस (?:मिल|दे|कर)",
      "పూర్తి రిఫండ్", "రిఫండ్\\S* (?:ఇస్తా|వస్తుంది)", "డబ్బు\\S* (?:తిరిగి|వాపస్) (?:ఇస్తా|వస్తా|వస్తుంది)",
    ]),
  },
  {
    rule: words(["discount", "coupon", "cheaper", "lower (?:the )?price", "price cut", "\\d+ ?% off", "डिस्काउंट", "छूट", "డిస్కౌంట్", "తగ్గింపు"]),
    hit: words(["discount", "coupon", "\\d+ ?(?:%|percent) off", "cheaper", "डिस्काउंट", "छूट", "డిస్కౌంట్", "తగ్గింపు"], "giu"),
    breaks: words([
      "(?:you|we|i)(?:['’]ll| will| can) (?:get|give|offer|do)(?: you)? (?:a |an |the |extra |special )?(?:\\d+ ?(?:%|percent) )?(?:discount|off\\b)",
      "special (?:discount|price)", "extra discount", "discount (?:mil|de)",
      "डिस्काउंट (?:मिल|दे)", "छूट (?:मिल|दे)", "డిస్కౌంట్\\S* ఇస్తా", "తగ్గింపు\\S* ఇస్తా",
    ]),
  },
  {
    rule: words(["guarantee", "assure", "promise (?:results|success|income|returns|accuracy)", "गारंटी", "గ్యారంటీ"]),
    hit: words(GUARANTEE, "giu"),
    breaks: words(GUARANTEE),
  },
  {
    rule: words(FREE),
    hit: words(FREE, "giu"),
    breaks: words([
      "free (?:forever|for ever|for life|for lifetime)", "(?:forever|always|lifetime) free", "free lifetime",
      "hamesha (?:ke liye )?free", "हमेशा (?:के लिए )?(?:फ्री|मुफ्त|मुफ़्त)", "ఎప్పటికీ (?:ఉచిత|ఫ్రీ)", "జీవితాంతం (?:ఉచిత|ఫ్రీ)",
    ]),
  },
  {
    rule: words(["date", "deadline", "deliver", "timeline", "time ?frame", "eta>", "arriv", "तारीख", "डिलीवरी", "తేదీ", "డెలివరీ"]),
    hit: words([
      "tomorrow", "tonight", "(?:mon|tues|wednes|thurs|fri|satur|sun)day", "next (?:week|month)", "this (?:week|weekend)",
      "within a (?:day|week)", "\\d+ (?:working |business )?(?:days|hours|weeks)", "end of (?:the )?(?:day|week|month)",
      "\\d{1,2}(?:st|nd|rd|th)? (?:of )?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)", "(?:jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)[a-z]* \\d{1,2}",
      "kal>", "parso", "\\d+ din>", "hafte", "कल>", "परसों", "(?:सोम|मंगल|बुध|गुरु|शुक्र|शनि|रवि)वार", "\\d+ दिन", "हफ्ते", "हफ़्ते",
      "రేపు", "ఎల్లుండి", "(?:సోమ|మంగళ|బుధ|గురు|శుక్ర|శని|ఆది)వారం", "రోజుల్లో", "వారంలో", "repu>", "rojullo",
    ], "giu"),
  },
  {
    rule: words(["price", "pricing", "cost", "fee>", "fees>", "charge", "rate>", "rates>", "amount", "कीमत", "दाम", "प्राइस", "रेट", "ధర", "ప్రైస్", "రేటు"]),
    hit: words(["[₹$] ?\\d", "(?:rs|inr|usd)\\.? ?\\d", "\\d[\\d,.]* ?(?:rupee|rs\\b|dollar|bucks|रुपय|रुपए|రూపాయ)"], "giu"),
  },
];

const TE = /[ఀ-౿]/;
const HI = /[ऀ-ॿ]/;
const native = (s: string) => TE.test(s) || HI.test(s);
const PCT = /(\d+(?:\.\d+)?) ?(?:%|percent|प्रतिशत|శాతం)/giu;
const pcts = (s: string) => [...s.matchAll(PCT)].map((m) => Number(m[1]));
const ENGLISH = /\b(?:the|you|your|is|are|will|can|we|our|it|this|that|have|has|for|with|please|thank)\b/gi;
const STOP = new Set(
  "the and for with from that this than then when what who your you our their them they any all more less other others into about over under before after very just only also not never always been have has had was were are will would should could can may might must".split(" "),
);
const stems = (s: string) =>
  new Set((s.toLowerCase().match(/[\p{L}\p{M}]{3,}/gu) ?? []).filter((w) => !STOP.has(w)).map((w) => w.slice(0, 5)));

// The words around a match, out to the nearest , . ! ? । ; or line break.
function clause(s: string, at: number, len: number) {
  const start = s.slice(0, at).search(/[^,.!?।;\n]*$/u);
  const end = at + len + s.slice(at + len).search(/[,.!?।;\n]|$/u);
  return s.slice(start, end).trim().slice(0, 160);
}

function onTopic(r: Rule, reply: string): Verdict {
  const limit = Math.min(...pcts(r.text)); // "Give a discount above 10%": only a bigger number breaks it
  let v: Verdict = native(reply) ? "unsure" : "ok"; // the Telugu and Hindi word lists are short: no hit proves little there
  for (const t of TOPICS) {
    if (!t.rule.test(r.text)) continue;
    for (const m of reply.matchAll(t.hit)) {
      const c = clause(reply, m.index ?? 0, m[0].length);
      const over = pcts(c).find((p) => p > limit);
      const phrase = limit === Infinity && t.breaks ? c.match(t.breaks)?.[0] : undefined;
      if (SOFT.test(c)) v = "unsure";
      else if (over !== undefined) return { quote: c, why: `${over}% is above the ${limit}% limit.` };
      else if (phrase) return { quote: c, why: `Sounds like a promise: "${phrase}".` };
      else v = "unsure";
    }
  }
  return v;
}

// "Reply in the caller's language" or "Speak Telugu": compare scripts.
function language(r: Rule, reply: string, caller: string): Verdict {
  const follow = /caller|their|same|customer/i.test(r.text);
  const want = follow
    ? TE.test(caller) ? "Telugu" : HI.test(caller) ? "Hindi" : caller ? "English" : ""
    : /telugu|తెలుగు/i.test(r.text) ? "Telugu" : /hindi|हिंदी|हिन्दी/i.test(r.text) ? "Hindi" : "English";
  if (!want) return "ok";
  if (want === "English") return native(reply) ? "unsure" : "ok";
  if ((want === "Telugu" ? TE : HI).test(reply)) return "ok";
  if (native(reply) || new Set(reply.toLowerCase().match(ENGLISH)).size < 2) return "unsure";
  return { quote: clause(reply, 0, 0), why: `${follow ? "The caller spoke" : "The rule asks for"} ${want}, but the reply is in English.` };
}

// Any other rule: the AI looks only if the turn shares a word with the rule (or is in a script the rule isn't).
function touches(r: Rule, reply: string, caller: string) {
  const talk = `${reply} ${caller}`;
  if (native(talk) && !native(r.text)) return true;
  const said = stems(talk);
  return [...stems(r.text)].some((w) => said.has(w));
}

/** Rule-based first pass: settles obvious breaks and lists the rules only the AI can judge. */
export function keywordCheck(rules: Rule[], reply: string, caller = "") {
  reply = reply.normalize("NFC");
  caller = caller.normalize("NFC");
  const broken: Broken[] = [];
  const unsure: string[] = [];
  for (const rule of rules) {
    const r = { ...rule, text: rule.text.normalize("NFC") };
    const lang = /telugu|hindi|english|తెలుగు|हिंदी|हिन्दी/i.test(r.text) || (/language|భాష|भाषा/i.test(r.text) && /caller|their|same|customer/i.test(r.text));
    const v: Verdict =
      r.kind === "never" && TOPICS.some((t) => t.rule.test(r.text))
        ? onTopic(r, reply)
        : r.kind === "always" && lang
          ? language(r, reply, caller)
          : touches(r, reply, caller)
            ? "unsure"
            : "ok";
    if (v === "unsure") unsure.push(r.id);
    else if (v !== "ok") broken.push({ rule_id: r.id, ...v });
  }
  return { broken, unsure };
}
