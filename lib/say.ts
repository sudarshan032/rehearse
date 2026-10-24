// First pass for the one input box: the stage plus keywords in English, Hindi and Telugu (romanised,
// and a few in their own script). Instant and free. null means "not sure": the route then asks the LLM.

export const STAGES = ["describe", "interview", "blueprint", "rehearse"] as const;
export const INTENTS = ["brief", "answers", "edit", "rehearse_start", "caller_turn", "navigate", "build_now", "question"] as const;
export const TABS = ["flow", "rules", "knowledge", "prompt", "stack", "rehearse", "voice", "export", "bots", "sample", "home", "back"] as const;
export type Stage = (typeof STAGES)[number];
export type Intent = (typeof INTENTS)[number];
export type Tab = (typeof TABS)[number];
export type Guess = { intent: Intent; tab?: Tab; answer?: string };

// What a stage falls back to, and the intents that make sense in it.
export const STAGE_DEFAULT: Record<Stage, Intent> = { describe: "brief", interview: "answers", blueprint: "edit", rehearse: "caller_turn" };
export const ALLOWED: Record<Stage, Intent[]> = {
  describe: ["brief", "navigate", "build_now", "question"],
  interview: ["answers", "navigate", "build_now", "question"],
  blueprint: ["edit", "navigate", "rehearse_start", "question"],
  rehearse: ["caller_turn", "edit", "navigate", "rehearse_start", "question"],
};

// Words that name a part of the app, checked in this order.
const TAB_WORDS: [Tab, RegExp][] = [
  ["export", /\b(export|download)\b|एक्सपोर्ट/],
  ["voice", /\b(voice test|real call|real voice|hear (it|the bot))\b/],
  ["stack", /\b(stack|speed|latency)\b/],
  ["prompt", /\bprompt\b|प्रॉम्प्ट|ప్రాంప్ట్/],
  ["knowledge", /\b(knowledge|facts|faqs?)\b/],
  ["rules", /\brules\b|रूल्स|రూల్స్/],
  ["flow", /\b(flow|steps|canvas|diagram)\b|फ्लो|ఫ్లో/],
  ["rehearse", /\b(rehearsal|practice) (tab|page|screen)\b/],
  ["bots", /\b(my bots|all (my )?bots|bot list)\b/],
  ["sample", /\b(sample|example|demo) bot\b|\bthe sample\b/],
  ["back", /\b(go back|wapas|venakki)\b|^back$/],
];
const NAV =
  /\b(show|open|go( back)? to|take me|switch to|view|display|let me see|see the|dikhao|dikha do|dikhaiye|kholo|khol do|chupinchu|choopinchu|chupinchandi|chupistava|open cheyyi|open chey|teruvu)\b|दिखाओ|दिखाइए|खोलो|చూపించు|చూపించండి|తెరువు/;
const EDIT =
  /\b(add|remove|delete|drop|change|make|set|rename|replace|update|move|insert|put|use|switch|enable|disable|turn (on|off)|should|shouldn'?t|must|never|always|don'?t|do not|instead|also|ask|say|tell|mention|offer|greet|speak|reply|answer|keep|too (long|short|formal|casual|pushy|robotic|much)|karo|kar do|daalo|dalo|hatao|hata do|badlo|badal do|bolo|pucho|poocho|chahiye|mat|kabhi|hamesha|cheyyi|cheyandi|pettu|pettandi|teeseyi|teesey|maarchu|marchu|adugu|adagandi|cheppu|cheppandi|vaddu|kavali)\b|करो|कर दो|हटाओ|बदलो|बोलो|पूछो|चाहिए|कभी|हमेशा|చేయి|చేయండి|పెట్టు|తీసేయి|మార్చు|అడుగు|చెప్పు|వద్దు|కావాలి/;
const BUILD =
  /\b(just build|build (it|the bot|now|karo|cheyyi|chey|cheyandi)|skip (it|this|these|them|the rest|the questions|questions)|no more questions|enough questions|bana do|banao)\b|बना दो|बनाओ|బిల్డ్ చేయి/;
const DONE = /^(skip|done|enough|bas|chaalu|go ahead|build|that'?s (all|it|enough))\b|^(बस|చాలు)/;
const ASK =
  /^((what|why|how|which|when|where|who|whose|does|is|are|was|were|kya|kyun|kyon|kaise|kab|kaun|kitna|kitne|kitni|enti|emiti|ela|enduku|eppudu|evaru|enni|entha)\b|क्या|क्यों|कैसे|कितना|ఏమి|ఎందుకు|ఎలా|ఎంత)|\?$/;
const POLITE = /^(please|pls|can you|could you|would you|can we|could we|kya aap|zara)\b/;
const START =
  /\b(rehears\w*|practi[cs]e|role ?play|mock call|test (it|this|the bot|the agent)|try (it|a call)|let'?s (try|test)|(start|do|run) (a |the )?(test |practice |mock |dummy )?call|test (karo|cheddam|cheyyi)|try (karo|cheddam))\b/;
const START_FIRST = /^(ok(ay)?,? )?(now,? )?(let'?s |please )?(rehears|practi[cs]e|role ?play|mock|test|try|start|run|do a)/;
const RESTART = /\b(restart (the |this )?(call|rehearsal)|start (it |the call )?(again|over)|(new|another) (call|rehearsal)|rehears\w*|role ?play)\b/;
// During a rehearsal, words that are clearly about the bot (a fix), not said to it.
const META =
  /\b(the (bot|agent) (should|shouldn'?t|must|needs to|has to|said|says|did|didn'?t|is (too|wrong))|you should(n'?t| not)? have|should(n'?t| not)? have (said|asked)|next time|from now on|(add|remove|change|fix|update) (a |an |the |this |that )?(rule|step|fact|reply|line|greeting)|wrong (answer|reply)|bot (ko|ne|ki|ku|ni))\b/;
const ABOUT_BOT = /\b(bot|agent|rule|step|prompt|it should|it shouldn'?t|instead|wrong|why did it|why does it)\b/;

export const wantsBuild = (said: string) => BUILD.test(said.toLowerCase().slice(-40));
export const personaOf = (said: string) => said.match(/\bas (?:an? |the )?([^.,!?]{3,60})$/i)?.[1].trim();

export function guessIntent(stage: Stage, said: string, pointing = false): Guess | null {
  const t = said.toLowerCase().trim();
  const words = t.split(/\s+/).length;
  const edit = EDIT.test(t);
  const tab = TAB_WORDS.find(([, re]) => re.test(t))?.[0];
  if (tab && words <= 6 && (NAV.test(t) || (words <= 3 && !edit))) return { intent: "navigate", tab };
  if (stage !== "describe" && words <= 8 && /\b(new|another|different) bot\b/.test(t)) return { intent: "navigate", tab: "home" };
  const question = ASK.test(t) && !POLITE.test(t);
  switch (stage) {
    case "describe":
    case "interview":
      if (words <= 4 && (BUILD.test(t) || DONE.test(t))) return { intent: "build_now" };
      return question && words <= 12 ? { intent: "question" } : { intent: STAGE_DEFAULT[stage] };
    case "blueprint":
      if (START.test(t) && (START_FIRST.test(t) || !edit)) return { intent: "rehearse_start" };
      if (question && !(pointing && edit)) return { intent: "question" };
      return pointing || edit ? { intent: "edit" } : null;
    case "rehearse":
      if (RESTART.test(t)) return { intent: "rehearse_start" };
      if (META.test(t)) return { intent: "edit" };
      if (pointing) return edit ? { intent: "edit" } : null;
      return ABOUT_BOT.test(t) ? null : { intent: "caller_turn" };
  }
}
