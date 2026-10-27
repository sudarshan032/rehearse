"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { langName, TOOL_SHELF, type Bot, type Interview } from "@/lib/bot";
import { guessIntent, personaOf, type Stage as SayStage, type Tab } from "@/lib/say";
import { getDraft, listDrafts, newId, post, removeDraft, saveDraft, type Change, type Draft } from "@/lib/store";
import { EXPORTS } from "@/lib/export";
import { SAMPLE_BOT, SAMPLE_BRIEF, SAMPLE_CALL, SAMPLE_ID, sampleFix, sampleReplay } from "@/lib/sample";
import { loadVoiceByName, pickVoiceName, preloadVoice, speak, stopSpeaking, voicesFor, type SpeakLang } from "@/lib/speak";
import { Flow } from "./Flow";

type Scene = "describe" | "questions" | "building" | "blueprint" | "rules" | "knowledge" | "prompt" | "stack" | "call" | "fix" | "voice" | "export" | "bots" | "proof";
type Broken = { rule_id: string; quote: string; why: string };
type Line = { role: "caller" | "bot"; text: string; step_id?: string; broken?: Broken[]; ended?: boolean; fixed?: boolean; cut?: number; unchecked?: boolean };
type SRClass = new () => {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void;
  start(): void; stop(): void; abort(): void;
};
type Call = {
  stream: MediaStream; ac: AudioContext; an: AnalyserNode; history: Line[];
  phase: "listening" | "thinking" | "speaking"; since: number; lang: string;
  sr?: InstanceType<SRClass>; srText?: string; loud?: boolean; loudSince?: number; turnStart?: number;
  pcm: { t: number; d: Float32Array }[];
};
const srClass = () =>
  typeof window === "undefined" ? undefined
    : ((window as unknown as { SpeechRecognition?: SRClass }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: SRClass }).webkitSpeechRecognition);
// Raw mic sound → a small 16 kHz WAV file for Whisper.
function toWav(parts: Float32Array[], rate: number) {
  const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((o, p) => (all.set(p, o), o + p.length), 0);
  const step = rate / 16000, n = Math.floor(all.length / step);
  const buf = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o: number, x: string) => [...x].forEach((ch, i) => buf.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF"); buf.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt "); buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true); buf.setUint16(22, 1, true); buf.setUint32(24, 16000, true); buf.setUint32(28, 32000, true);
  buf.setUint16(32, 2, true); buf.setUint16(34, 16, true); str(36, "data"); buf.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) buf.setInt16(44 + i * 2, Math.max(-1, Math.min(1, all[Math.floor(i * step)])) * 0x7fff, true);
  return new Blob([buf], { type: "audio/wav" });
}
const srLang = (l: string) => (l === "te" ? "te-IN" : l === "hi" ? "hi-IN" : "en-IN");
type Target = { kind: "step" | "rule" | "knowledge" | "prompt" | "turn"; id?: string; text?: string; label: string };
type EditResult = { bot: Bot; summary: string; changed: { steps: string[]; rules: string[]; knowledge: string[] }; applied: number };
type SayRes = { intent: string; tab?: Tab; answer?: string; persona?: string } & Partial<EditResult>;
type Timing = { hear: number; think: number; speak: number; total: number; left?: string };

const PROGRESS: [string, Scene][] = [["Describe", "describe"], ["Questions", "questions"], ["Blueprint", "blueprint"], ["Rehearse", "call"], ["Fix", "fix"], ["Voice test", "voice"], ["Export", "export"]];
const SAY_STAGE: Record<Scene, SayStage> = {
  describe: "describe", questions: "interview", building: "interview", blueprint: "blueprint", rules: "blueprint", knowledge: "blueprint",
  prompt: "blueprint", stack: "blueprint", call: "rehearse", fix: "rehearse", voice: "blueprint", export: "blueprint", bots: "describe", proof: "describe",
};
const TAB_SCENE: Partial<Record<Tab, Scene>> = { flow: "blueprint", rules: "rules", knowledge: "knowledge", prompt: "prompt", stack: "stack", rehearse: "call", voice: "voice", export: "export", bots: "bots", home: "describe" };
const HINTS: Record<Scene, string[]> = {
  describe: ["show me the sample", "A sales bot that calls my free users", "నా saree shop కోసం ఒక support bot"],
  questions: ["answer them all in one go", "just build it", "ask me more"],
  building: [],
  blueprint: ["rehearse as an angry customer", "show the rules", "zoom in"],
  rules: ["drop rule 3", "never share prices on WhatsApp", "back to the flow"],
  knowledge: ["add: the trial is 14 days", "show the prompt", "back to the flow"],
  prompt: ["make it more polite", "show the stack", "back to the flow"],
  stack: ["voice test", "export", "back to the flow"],
  call: ["It's too expensive for me", "speak the replies", "stop the call"],
  fix: ["replay", "rehearse again", "back to the flow"],
  voice: ["start the call", "end the call", "back to the flow"],
  export: ["copy the prompt", "download vapi", "start a new bot"],
  bots: ["start a new bot", "open the first one"],
  proof: ["show me the sample", "my bots", "start a new bot"],
};
const PLACEHOLDER: Partial<Record<Scene, string>> = {
  describe: "Describe your bot…",
  questions: "Answer all of them in one go…",
  call: "Speak as the customer…",
  fix: "Say the fix, or “replay”…",
};

// Dev only: input and focus events go to .cache/session.log so input problems can be read later.
const log = (ev: string, data: Record<string, unknown> = {}) => {
  if (process.env.NODE_ENV === "production") return;
  fetch("/api/log", { method: "POST", body: JSON.stringify({ ev, ...data }), keepalive: true }).catch(() => {});
};

// The journey, in order. The side panel shows it; "next", "back" and "go to …" move along it.
const JOURNEY: { s: Scene; name: string; sub?: boolean; re: RegExp }[] = [
  { s: "describe", name: "Describe", re: /\b(home( ?page)?|start(ing)? page|beginning|describe)\b/ },
  { s: "questions", name: "Questions", re: /\bquestions?\b/ },
  { s: "blueprint", name: "Flow", re: /\b(flow|blueprint|canvas|diagram|steps)\b/ },
  { s: "rules", name: "Rules", sub: true, re: /\brules?\b/ },
  { s: "knowledge", name: "Facts", sub: true, re: /\b(facts?|knowledge)\b/ },
  { s: "prompt", name: "Prompt", sub: true, re: /\bprompt\b/ },
  { s: "stack", name: "Stack & speed", sub: true, re: /\b(stack|speed)\b/ },
  { s: "call", name: "Rehearse", re: /\b(rehears\w*|call|practice)\b/ },
  { s: "fix", name: "Changes", re: /\b(fix(es)?|changes|history|versions?)\b/ },
  { s: "voice", name: "Voice test", re: /\bvoice( te[sx]t)?\b/ },
  { s: "export", name: "Export", re: /\b(export|download)\b/ },
  { s: "bots", name: "My bots", re: /\b(my bots|all bots|bots)\b/ },
  { s: "proof", name: "Proof", re: /\b(proof|results?|before and after)\b/ },
];
const NEXT = /^(please |ok(ay)? |now |just )?((move|go) )?(forward|next|onward|ahead|on)( step| page| one)?$|^(continue|next step|move on|go ahead|proceed)$/;
const PREV = /^(please |ok(ay)? |now |just )?((move|go|step) )?(back(ward)?|previous|before)( step| page| one)?$|^(wapas|venakki)$/;

// The intro sentence: [word, cut?]. Filler and the self-correction get cut, like Wispr does.
// Intro examples, one per language. "~" marks a filler word that gets struck out and cut.
const INTROS = [
  { lang: "English", said: "~So ~um, I want a bot that ~uh calls ~my ~users, ~actually ~no, my free users in Telugu, and never promises refunds.",
    steps: ["Greet", "Ask about the limit", "Offer the Pro trial"], rule: "Never promise a refund" },
  { lang: "Hindi + English", said: "~Umm, ek reminder bot chahiye jo ~uh, ~matlab, clinic ke patients ko Hindi mein call kare, aur medical advice kabhi na de.",
    steps: ["Greet", "Confirm the slot", "Offer a new time"], rule: "Never give medical advice" },
  { lang: "Telugu + English", said: "~ఉమ్, నా saree shop కి ~అంటే, ఒక support bot కావాలి, order status చెప్పాలి, discount promise చేయకూడదు.",
    steps: ["Greet", "Find the order", "Share the status"], rule: "Never promise a discount" },
].map((x) => ({ ...x, words: x.said.split(" ").map((w) => [w.replace(/^~/, ""), w.startsWith("~")] as [string, boolean]) }));

const langOf = (s: string) => (/[ఀ-౿]/.test(s) ? "TE" : /[ऀ-ॿ]/.test(s) ? "HI" : "EN");
// The voice follows the language most of the reply is in. Telugu or Hindi counts once it is a real part of the
// line (a third of the letters), so "English, हिंदी, or తెలుగు?" stays English and "Pro లో limit ఉండదు" is Telugu.
const ttsLang = (s: string, bot: Bot): SpeakLang => {
  const n = (re: RegExp) => s.match(re)?.length ?? 0;
  const [te, hi, en] = [n(/[ఀ-౿]/g), n(/[ऀ-ॿ]/g), n(/[a-z]/gi)];
  const all = te + hi + en || 1;
  if (te / all >= 0.33 && te >= hi) return "te-IN";
  if (hi / all >= 0.33) return "hi-IN";
  return en || !bot.persona.voice.lang ? "en-IN" : (bot.persona.voice.lang as SpeakLang);
};
// Whole-input matches only: "Revert to English if they're confused" is an edit, not undo.
const undoRe = /^(undo|undo that|undo it|undo the (last )?(change|fix)|revert( it| that)?|wapas karo)[.!]?$/i;
const replayRe = /^(replay|replay (it|that|the (turn|line))|try (it )?again|again)[.!]?$/i;
const backRe = /^(back|go back|previous|wapas|venakki)\.?$/i;
const stopRe = /\b(stop|end|hang up|cut) (the )?call\b/i;
const moreRe = /\bask (me )?more\b/i;
const downloadRe = /^(please )?(download|save it|export it)( (it|the|a|my)?\s*(json|backup|prompt|vapi|retell|pipecat|file|bot|everything)( file)?)?[.!]?$/i;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // Safari cancels the download if this runs right away
}

const I = ({ d, w = 2 }: { d: string; w?: number }) => (
  <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);
const IC = {
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  stage: '<path d="M3 21V9.5a9 9 0 0 1 18 0V21M3 21h18M9 17v-3M12 18v-6M15 17v-3"/>',
  wave: '<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3l7 3v5c0 4.4-2.9 8-7 10-4.1-2-7-5.6-7-10V6z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  path: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  bots: '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01"/>',
};

export default function Stage() {
  const [scene, setScene] = useState<Scene>("describe");
  const [past, setPast] = useState<Scene[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [heard, setHeard] = useState<{ q: string; res: string; err?: boolean; ans?: boolean } | null>(null);
  const [panel, setPanel] = useState(true);
  const [ix, setIx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [talk, setTalk] = useState(false); // speak the bot's replies out loud in a rehearsal
  const [changed, setChanged] = useState<EditResult["changed"] & { summary: string } | null>(null);
  const [undo, setUndo] = useState<Bot[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [persona, setPersona] = useState("");
  const [report, setReport] = useState(false); // the rehearsal call was stopped: show its report
  const [fix, setFix] = useState<{ step?: string; rule?: string; before: string; summary: string } | null>(null);
  const [vig, setVig] = useState("");
  const [counting, setCounting] = useState(false);
  const [timing, setTiming] = useState<Timing | null>(null);
  const [live, setLive] = useState<"off" | "listening" | "thinking" | "speaking">("off");
  const [vlines, setVlines] = useState<Line[]>([]);
  const call = useRef<Call | null>(null);
  const [interim, setInterim] = useState("");
  const [spoken, setSpoken] = useState(0);
  const spokenRef = useRef(0);
  const [barge, setBarge] = useState(true);
  const epoch = useRef(0); // bumps when you change screen or bot; late AI answers for the old one are dropped
  const sampleTimers = useRef<number[]>([]);
  const clearSample = () => (sampleTimers.current.forEach(clearTimeout), (sampleTimers.current = []));
  const starting = useRef(false);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const bargeRef = useRef(true);
  bargeRef.current = barge;
  const convoEl = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const micEl = useRef<HTMLDivElement>(null);
  const micBox = useRef<HTMLDivElement>(null);
  const mainEl = useRef<HTMLElement>(null);
  // "More below": shown while the open screen has content under its bottom edge, so a cut-off line reads as "scroll", not as broken.
  const [more, setMore] = useState(false);
  // Dev log: any crash in the page, with where it happened.
  useEffect(() => {
    const err = (e: ErrorEvent) => log("page-error", { msg: e.message, at: `${e.filename}:${e.lineno}`, stack: e.error?.stack?.split("\n").slice(0, 4).join(" | ") });
    const rej = (e: PromiseRejectionEvent) => log("page-rejection", { msg: String(e.reason?.message ?? e.reason), stack: e.reason?.stack?.split("\n").slice(0, 4).join(" | ") });
    addEventListener("error", err);
    addEventListener("unhandledrejection", rej);
    return () => (removeEventListener("error", err), removeEventListener("unhandledrejection", rej));
  }, []);
  // The screens end where the input block begins: it grows when the "heard" line wraps or the hints wrap,
  // and nothing on a screen may slide under it.
  useEffect(() => {
    const el = micBox.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--mic-h", `${Math.ceil(innerHeight - el.getBoundingClientRect().top) + 8}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [theme, setTheme] = useState("light");
  const inp = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const queued = useRef(false);
  const lastSaid = useRef("");
  const later = useRef<string[]>([]); // dictations that arrived while another one was waiting
  const lastTurn = useRef(""); // the call turn that broke a rule, for "@Last reply"
  const clickBase = useRef<{ at: number; text: string }>({ at: 0, text: "" });

  // Put dictated text into the box and send it after a short countdown.
  function insert(t: string, how: string) {
    const el = inp.current;
    if (!el) return;
    // Something is already waiting to run: keep this one for after it, don't glue two commands together.
    if (queued.current) {
      later.current.push(t.trim());
      log("insert", { how: "later", len: t.length });
      return;
    }
    const v = (el.value.trim() ? el.value.trimEnd() + " " : "") + t.trim();
    el.value = v;
    el.focus({ preventScroll: true });
    setText(v);
    log("insert", { how, len: v.length });
    clearTimeout(timer.current);
    setCounting(true);
    timer.current = setTimeout(() => handleRef.current(v), 700);
  }
  const bot = draft?.bot;

  // "@Greet", "@Rule 2", "@Fact 1", "@Last reply": parts of the bot named in the box. Changes go to them.
  const mentionables: (Target & { token: string })[] = bot
    ? [
        ...bot.flow.steps.map((x, i, all) => ({
          token: all.filter((y) => y.label === x.label).length > 1 ? `@${x.label} ${i + 1}` : `@${x.label}`, // two "End" steps stay apart
          kind: "step" as const, id: x.id, label: `step ${i + 1}`,
        })),
        ...bot.rules.map((x, i) => ({ token: `@Rule ${i + 1}`, kind: "rule" as const, id: x.id, label: `rule ${i + 1}` })),
        ...bot.knowledge.map((x, i) => ({ token: `@Fact ${i + 1}`, kind: "knowledge" as const, id: x.id, label: `fact ${i + 1}` })),
        ...(lastTurn.current ? [{ token: "@Last reply", kind: "turn" as const, id: undefined, text: lastTurn.current, label: "the reply that broke a rule" }] : []),
      ].sort((a, b) => b.token.length - a.token.length)
    : [];
  const mentionsIn = (v: string) => {
    let rest = v;
    const found: typeof mentionables = [];
    for (const m of mentionables)
      if (rest.includes(m.token)) {
        found.push(m);
        rest = rest.split(m.token).join(" ");
      }
    found.sort((x, y) => v.indexOf(x.token) - v.indexOf(y.token));
    return { found, rest: rest.trim() };
  };
  const targets = mentionsIn(text).found;
  const sel = targets[0] ?? null;
  const setBox = (v: string) => {
    setText(v);
    if (inp.current) inp.current.value = v;
    inp.current?.focus({ preventScroll: true });
  };
  const hl = useRef<HTMLDivElement>(null);
  const marked = (v: string) => {
    if (!mentionables.length || !v.includes("@")) return v;
    const re = new RegExp(`(${mentionables.map((m) => m.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
    return v.split(re).map((part, i) => (i % 2 ? <mark key={i} className={part === "@Last reply" ? "bad" : ""}>{part}</mark> : part));
  };
  const clearMentions = () => setBox(mentionsIn(text).rest);
  // Click: replace the mention (or add it if you already typed something). Double-click or Shift-click: add.
  function attach(token: string, add = false, dbl = false) {
    const now = Date.now();
    // A double-click starts with two single clicks: undo those and add from where we were.
    const base = dbl && now - clickBase.current.at < 600 ? clickBase.current.text : text;
    if (!add && now - clickBase.current.at > 600) clickBase.current = { at: now, text };
    const { found, rest } = mentionsIn(base);
    if (!add && !rest && found.length === 1 && found[0].token === token) return setBox("");
    if (found.some((f) => f.token === token) && add) return setBox(base);
    const next = !add && !rest ? `${token} ` : `${base.trimEnd()} ${token} `.trimStart();
    setBox(next);
  }

  // The intro plays the next language example every 7 s while the first screen is open.
  useEffect(() => {
    if (scene !== "describe") return;
    const t = setInterval(() => setIx((i) => (i + 1) % INTROS.length), 7000);
    return () => clearInterval(t);
  }, [scene]);

  // Leaving a rehearsal stops its spoken reply and any sample lines still queued.
  const prevScene = useRef(scene);
  useEffect(() => {
    if (prevScene.current === "call" && scene !== "call") {
      stopSpeaking();
      clearSample();
    }
    prevScene.current = scene;
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Just changed" highlights last until you move to another screen (the edit's own jump does not count).
  const keepChanged = useRef(false);
  useEffect(() => {
    if (keepChanged.current) keepChanged.current = false;
    else setChanged(null);
  }, [scene]);

  // Both transcripts keep the newest words in view; scroll up any time to read back.
  useEffect(() => {
    const el = convoEl.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [vlines, interim, spoken]);
  const subsEl = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = subsEl.current;
    // Show the newest line from its label down; if it is taller than the box (a red line with its stamp), its top wins.
    if (el) setTimeout(() => {
      const last = el.lastElementChild as HTMLElement | null;
      const top = last ? Math.min(el.scrollHeight, last.offsetTop - el.offsetTop - 8) : el.scrollHeight;
      el.scrollTo({ top: last && last.offsetHeight > el.clientHeight ? top : el.scrollHeight, behavior: "smooth" });
    }, 50);
  }, [lines]);
  // A line cut by the top edge of the transcript is hidden, so no half label or half sentence shows.
  const hideCut = (el: HTMLElement) => {
    for (const c of el.children as HTMLCollectionOf<HTMLElement>) c.classList.toggle("cut", c.offsetTop - el.offsetTop < el.scrollTop - 2 && c.offsetTop - el.offsetTop + c.offsetHeight > el.scrollTop);
  };

  // Leaving the Voice test hangs up the call.
  useEffect(() => {
    if (scene !== "voice" && call.current) callEnd();
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  // On smaller laptop screens the path panel starts as a small tab; opened, it floats over the stage.
  useEffect(() => {
    if (innerWidth < 1400) setPanel(false);
  }, []);

  // Restore the bot that was open before a reload.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? "light");
    try {
      const open = sessionStorage.getItem("rehearse:open");
      const d = open ? getDraft(open) : undefined;
      if (d) {
        setDraft(d);
        // Back to the same screen after a reload (screens that need a live call or fix fall back to the flow).
        const was = sessionStorage.getItem("rehearse:scene") as Scene | null;
        const safe: Scene[] = ["describe", "blueprint", "rules", "knowledge", "prompt", "stack", "voice", "export", "bots", "proof"];
        setScene(d.bot ? (was && safe.includes(was) ? was : "blueprint") : d.interview ? "questions" : "describe");
      }
    } catch {}
  }, []);

  // Keep the one input focused so Wispr Flow always types into it.
  useEffect(() => {
    const refocus = () =>
      setTimeout(() => {
        const a = document.activeElement;
        if (a !== inp.current && !(a instanceof HTMLInputElement) && !(a instanceof HTMLSelectElement) && !String(getSelection())) inp.current?.focus({ preventScroll: true });
      }, 0);
    // A paste that lands anywhere on the page goes into the box.
    // Every paste is inserted by us, wherever it lands. Some pastes (Wispr's quick Cmd+V) fire the
    // paste event but the browser never inserts the text, so we never rely on the browser for it.
    const onPaste = (e: ClipboardEvent) => {
      const el = inp.current;
      const t = e.clipboardData?.getData("text") ?? "";
      log("paste", { target: (e.target as HTMLElement)?.tagName, inBox: e.target === el, len: t.length });
      if (!el || !t.trim()) return;
      e.preventDefault();
      insert(t, "paste");
    };
    // Typing anywhere goes into the box too.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key.toLowerCase() === "v") log("cmd+v", { active: document.activeElement?.tagName, inBox: document.activeElement === inp.current });
      if (document.activeElement === inp.current || e.metaKey || e.ctrlKey || e.altKey) return;
      const a = document.activeElement;
      if (e.key === " " && (a instanceof HTMLButtonElement || a instanceof HTMLAnchorElement)) return; // Space presses the button
      if (e.key.length === 1 && !(a instanceof HTMLInputElement) && !(a instanceof HTMLSelectElement)) inp.current?.focus({ preventScroll: true });
    };
    const onBlur = () => log("blur", { to: document.activeElement?.tagName });
    const onWinBlur = () => log("window-blur", { active: document.activeElement?.tagName });
    const onWinFocus = () => {
      log("window-focus", { active: document.activeElement?.tagName });
      refocus();
    };
    const el = inp.current;
    document.addEventListener("mouseup", refocus);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("focus", onWinFocus);
    window.addEventListener("blur", onWinBlur);
    el?.addEventListener("blur", onBlur);
    el?.focus();
    return () => {
      document.removeEventListener("mouseup", refocus);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("focus", onWinFocus);
      window.removeEventListener("blur", onWinBlur);
      el?.removeEventListener("blur", onBlur);
    };
  }, []);

  // The box grows with what you say (up to 40% of the screen) instead of turning into a tiny scroll area.
  useEffect(() => {
    const el = inp.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.4)}px`;
  }, [text]);

  // Load the free voice model when the Voice test opens (first time only, a few seconds).
  useEffect(() => {
    if (scene === "voice" || (scene === "call" && talk)) preloadVoice().catch(() => {});
  }, [scene, talk]);

  // After every screen change or finished step, the box gets the focus back.
  useEffect(() => {
    if (document.activeElement !== inp.current && !(document.activeElement instanceof HTMLInputElement)) inp.current?.focus({ preventScroll: true });
    log("scene", { scene, busy });
  }, [scene, busy]);

  // Records the first time a milestone happens for your own bots (not the sample).
  type Milestone = keyof NonNullable<Draft["times"]>;
  // The bot's version when a rehearsal first broke a rule: a clean turn on a later version is "fixed + retested".
  const brokeV = useRef<number | undefined>(undefined);
  const mark = (k: Milestone) =>
    setDraft((d) => {
      if (!d || d.id === SAMPLE_ID || d.times?.[k]) return d;
      const n = { ...d, times: { ...d.times, [k]: Date.now() } };
      saveDraft(n);
      return n;
    });

  const store = useCallback((d: Draft) => {
    setDraft(d);
    saveDraft(d);
    try {
      sessionStorage.setItem("rehearse:open", d.id);
    } catch {}
  }, []);

  function go(s: Scene, remember = true) {
    if (s === scene) return;
    epoch.current++;
    if (remember) setPast((p) => [...p.slice(-20), scene]);
    setScene(s);
    try {
      sessionStorage.setItem("rehearse:scene", s); // so a reload comes back to this screen
    } catch {}
    if (s !== "call" && s !== "fix") setVig("");
    if (s === "describe") setBox("");
  }
  function back() {
    // Skip screens that can't show anything now (no bot yet, or the build screen).
    const ok = (s: Scene) => s !== "building" && (s === "describe" || s === "bots" || s === "proof" || (s === "questions" ? !!draft?.interview : !!bot));
    const rest = [...past];
    let p: Scene | undefined;
    while ((p = rest.pop()) && !ok(p));
    setPast(rest);
    if (!p) return;
    setScene(p);
    setVig("");
  }
  const say = (q: string, res: string, extra?: { err?: boolean; ans?: boolean }) => {
    log(extra?.err ? "shown-error" : "shown", { scene: sceneRef.current, res });
    setHeard({ q, res, ...extra });
  };

  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(label);
    const e0 = epoch.current;
    try {
      const r = await fn();
      return epoch.current === e0 ? r : undefined; // you moved to another screen or bot meanwhile: ignore it
    } catch (e) {
      // Keep what was said in the box, so a busy AI never costs a re-dictation.
      if (lastSaid.current && !inp.current?.value.trim()) setBox(lastSaid.current);
      setHeard((h) => ({ q: h?.q ?? "", res: `${(e as Error).message} Your words are still in the box: press Enter to try again.`, err: true }));
    } finally {
      setBusy("");
    }
  }

  // ---------- the journey ----------
  async function brief(t: string) {
    brokeV.current = undefined;
    const t0 = Date.now();
    say(t, "Reading your brief…");
    const r = await run("Reading your brief", () => post<{ interview: Interview }>("/api/interview", { brief: t }));
    if (!r) return;
    store({ id: newId(), brief: t, interview: r.interview, answers: [], updated: 0, times: { start: t0 } });
    setUndo([]);
    setLines([]);
    say(t, `Got it: ${r.interview.name}. ${r.interview.questions.length} quick questions.`);
    go("questions");
  }

  async function askMore(t: string) {
    if (!draft?.interview) return;
    const qs = draft.interview.questions.map((q) => q.q).join(" / ").slice(0, 300);
    const answers = draft.answers.map((a) => ({ q: qs, a: a.a }));
    const r = await run("Thinking of more questions", () => post<{ interview: Interview }>("/api/interview", { brief: draft.brief, answers }));
    if (r) {
      store({ ...draft, interview: r.interview });
      say(t, `${r.interview.questions.length} more questions`);
    }
  }

  async function build(t: string, answer: string) {
    if (!draft) return;
    const qs = (draft.interview?.questions ?? []).map((q) => q.q).join(" / ").slice(0, 300);
    const all = [...draft.answers.map((a) => a.a), answer].filter((a) => a.trim()).join("\n").slice(0, 2000);
    const d = { ...draft, answers: all ? [{ id: "answer", q: qs, a: all }] : [] };
    store(d);
    go("building");
    say(t, "Building the bot…");
    const r = await run("Drawing the call flow", () => post<{ bot: Bot }>("/api/blueprint", { id: d.id, brief: d.brief, answers: d.answers }));
    if (!r) return setScene("questions");
    store({ ...d, bot: r.bot, times: { ...d.times, built: d.times?.built ?? Date.now() } });
    setChanged(null);
    say(t, `Built ${r.bot.flow.steps.length} steps, ${r.bot.rules.length} rules. Say “rehearse” to call it.`);
    setScene("blueprint");
  }

  function applyEdit(t: string, r: EditResult) {
    if (!draft?.bot) return;
    if (!r.applied) return say(t, r.summary, { ans: true });
    setUndo((u) => [...u.slice(-20), draft.bot!]);
    const lastBotLine = [...lines].reverse().find((l) => l.role === "bot");
    const onTurn = sel?.kind === "turn" || scene === "call";
    const brokeRule = onTurn && lastBotLine?.broken?.[0] ? `Rule ${r.bot.rules.findIndex((x) => x.id === lastBotLine.broken![0].rule_id) + 1}` : undefined;
    const entry: Change = { v: r.bot.version, summary: r.summary, ...(onTurn ? { before: lastBotLine?.text, step: lastBotLine?.step_id, rule: brokeRule } : {}) };
    store({ ...draft, bot: r.bot, log: [...(draft.log ?? []), entry].slice(-30) });
    keepChanged.current = true;
    setChanged({ ...r.changed, summary: r.summary });
    say(t, r.summary);
    const wasTurn = sel?.kind === "turn";
    // The box is empty after a change, so the next thing said ("rehearse", a caller line) is not taken as
    // another change to the same step. The changed parts stay highlighted on screen.
    if (wasTurn) lastTurn.current = "";
    if (wasTurn || scene === "call") {
      const last = [...lines].reverse().find((l) => l.role === "bot");
      const rule = last?.broken?.[0] && r.bot.rules.findIndex((x) => x.id === last.broken![0].rule_id);
      setFix({ step: last?.step_id, rule: rule !== undefined && rule >= 0 ? `Rule ${rule + 1}` : undefined, before: last?.text ?? "", summary: r.summary });
      setVig("");
      go("fix");
    } else if (r.changed.rules.length && scene !== "rules") go("rules");
    else if (r.changed.knowledge.length && scene !== "knowledge") go("knowledge");
    else if (r.changed.steps.length && scene !== "blueprint") go("blueprint");
  }

  function doUndo(t: string) {
    const prev = undo[undo.length - 1];
    if (!prev || !draft) return say(t, "Nothing to undo");
    setUndo(undo.slice(0, -1));
    store({ ...draft, bot: prev, log: draft.log?.slice(0, -1) });
    setChanged(null);
    setFix(null);
    say(t, `Undone. Back to v${prev.version}.`);
  }

  async function startCall(t: string, who?: string) {
    if (!bot) return;
    clearSample();
    lastTurn.current = "";
    setPersona(who ?? "");
    setReport(false);
    setLines([]);
    setVig("");
    setFix(null);
    go("call");
    say(t, who ? `Calling as ${who}. The bot speaks first.` : "Calling. The bot speaks first.");
    // The bot opens with its first step's line, word for word: instant, free, and always the right step.
    const start = bot.flow.steps.find((x) => x.kind === "start") ?? bot.flow.steps[0];
    setLines([{ role: "bot", text: start.says, step_id: start.id }]);
    if (talk) speak(start.says, ttsLang(start.says, bot)).catch(() => {});
  }

  async function callerTurn(t: string, base: Line[] = lines, b: Bot = bot!) {
    clearSample();
    const history = base.slice(-20).map(({ role, text, step_id }) => ({ role, text, step_id }));
    const mine: Line[] = [...base, { role: "caller", text: t }];
    setReport(false);
    setLines(mine);
    setVig("");
    const r = await run("Bot is thinking", () =>
      post<{ reply: string; step_id: string; ended: boolean }>("/api/turn", { bot: b, history, text: t }).catch((e) => sampleReplay(b, t) ?? Promise.reject(e)),
    );
    if (!r) return null;
    const line: Line = { role: "bot", text: r.reply, step_id: r.step_id, ended: r.ended };
    setLines([...mine, line]);
    if (talk) speak(r.reply, ttsLang(r.reply, b)).catch(() => {});
    const c = await run("Checking the rules", () =>
      post<{ broken: Broken[] }>("/api/check", { rules: b.rules.map(({ id, kind, text }) => ({ id, kind, text })), reply: r.reply, caller: t, knowledge: b.knowledge.map(({ text }) => ({ text })) }),
    );
    const checked = !!c && !(c as { ai_off?: boolean }).ai_off;
    mark("rehearsed");
    if (c?.broken?.length) (mark("broke"), (brokeV.current ??= b.version));
    else if (checked && brokeV.current !== undefined && b.version > brokeV.current) mark("fixed");
    const broken = c?.broken ?? [];
    const done = { ...line, broken, unchecked: !checked && !broken.length };
    log("rehearse-turn", { bot: `${b.name} v${b.version}`, caller: t, reply: r.reply, step: r.step_id, ended: r.ended, broken: broken.map((x) => x.rule_id), checked });
    setLines([...mine, done]);
    if (broken.length) {
      const ri = b.rules.findIndex((x) => x.id === broken[0].rule_id);
      const step = b.flow.steps.findIndex((s) => s.id === r.step_id);
      setVig("bad");
      lastTurn.current = `Caller: ${t}\nBot: ${r.reply}`;
      setTimeout(() => !inp.current?.value.trim() && setBox("@Last reply "), 0); // never wipe words you said meanwhile
      void step;
      say(t, `Broke rule ${ri + 1}. Say the fix.`);
    } else if (!checked) say(t, "Bot replied. The AI rule check is busy, so only simple checks ran. Say “replay” to check again.", { err: true });
    else say(t, r.ended ? "Call ended" : "Bot replied · rules kept");
    return done;
  }

  async function replay(t: string) {
    if (!bot) return;
    const i = lines.map((l) => l.role).lastIndexOf("caller");
    if (i < 0) return startCall(t, persona);
    go("call");
    const res = await callerTurn(lines[i].text, lines.slice(0, i), bot);
    if (res && !res.broken?.length && !res.unchecked) {
      mark("fixed");
      setLines((ls) => ls.map((l, k) => (k === ls.length - 1 ? { ...l, fixed: true } : l)));
      setVig("good");
      say(t, "Replayed with the fix · rule kept");
    }
  }

  // ---------- voice test (real mic → Whisper → LLM → free voice) ----------
  // ---------- voice test: a live, hands-free call ----------
  // Start once; then it loops: listen → you pause → Whisper → the bot → it speaks → listen again.
  // One loop watches the mic the whole call: it ends your turn when you pause, and while the bot talks it
  // listens for you cutting in (barge-in) and stops the bot, like a real phone call.
  async function callStart() {
    if (!bot || call.current || starting.current) return;
    starting.current = true; // a double click must not open two microphones
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      starting.current = false;
      return say("", "Allow the microphone to start the call", { err: true });
    }
    starting.current = false;
    if (sceneRef.current !== "voice" || call.current) return stream.getTracks().forEach((x) => x.stop()); // you left meanwhile
    const ac = new AudioContext();
    await ac.resume().catch(() => {});
    const an = ac.createAnalyser();
    an.fftSize = 1024;
    const src = ac.createMediaStreamSource(stream);
    src.connect(an);
    const c: Call = { stream, ac, an, history: [], phase: "thinking", since: performance.now(), lang: srLang(bot.languages[0]), pcm: [] };
    // The mic is kept as raw sound for the last 30 s, so a turn can start a moment BEFORE it was detected:
    // your first words are never lost, even when you cut in mid-sentence.
    // ponytail: ScriptProcessor is old but works everywhere with no extra file; move to an AudioWorklet if it is removed.
    const tap = ac.createScriptProcessor(4096, 1, 1);
    tap.onaudioprocess = (e) => {
      const d = new Float32Array(e.inputBuffer.getChannelData(0));
      c.pcm.push({ t: performance.now() - (d.length / ac.sampleRate) * 1000, d });
      while (c.pcm.length && c.pcm[0].t < performance.now() - 30_000) c.pcm.shift();
    };
    src.connect(tap);
    tap.connect(ac.destination); // it outputs silence; it only needs to be connected to run
    call.current = c;
    setVlines([]);
    setInterim("");
    setTiming(null);
    setHeard(null);
    watch(c);
    const start = bot.flow.steps.find((x) => x.kind === "start") ?? bot.flow.steps[0];
    await botSays(start.says, start.id, false);
    if (c.phase === "speaking") listen(c);
  }

  function callEnd(msg = "Call ended") {
    const c = call.current;
    if (!c) return;
    call.current = null;
    cancelAnimationFrame(raf.current);
    c.sr?.abort();
    c.stream.getTracks().forEach((t) => t.stop());
    c.ac.close().catch(() => {});
    stopSpeaking();
    setLive("off");
    setInterim("");
    say("", msg);
  }

  // The mic loop for the whole call.
  // ponytail: energy-based turn taking (pause of 750 ms ends your turn); swap in a VAD model if rooms are noisy.
  function watch(c: Call) {
    const buf = new Float32Array(c.an.fftSize);
    let floor = 0.006, voiced = 0, lastVoice = 0, prev = performance.now(), echo = 0, phase = c.phase, lastLog = 0;
    const tick = () => {
      if (call.current !== c) return;
      c.an.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length);
      const now = performance.now(), dt = now - prev;
      prev = now;
      if (phase !== c.phase) [phase, echo] = [c.phase, 0];
      micEl.current?.style.setProperty("--lv", Math.min(1, rms * 14).toFixed(2));
      if (c.phase === "listening") {
        if (rms > Math.max(0.012, floor * 3)) {
          if (!voiced) c.turnStart ??= now; // where your words begin
          [voiced, lastVoice] = [voiced + dt, now];
        } else {
          floor = floor * 0.97 + rms * 0.03;
          if (now - lastVoice > 1500) {
            voiced = Math.max(0, voiced - dt); // a lone cough fades out instead of adding up
            if (!voiced) c.turnStart = undefined;
          }
        }
        if (voiced > 350 && now - lastVoice > 750) {
          voiced = 0;
          endTurn(c, lastVoice);
        }
      } else if (c.phase === "speaking" && bargeRef.current) {
        // The bot's own voice comes back through the mic; only a voice clearly louder than that counts as you.
        c.loud = rms > Math.max(0.03, echo * 1.15, floor * 4);
        if (c.loud && !c.loudSince) c.loudSince = now; // when you may have started talking over the bot
        if (!c.loud && now - lastVoice > 400) c.loudSince = undefined;
        if (c.loud) lastVoice = now;
        if (now - c.since < 350 || rms < Math.max(0.04, echo * 1.6, floor * 4)) {
          echo = Math.max(echo * 0.995, rms);
          voiced = Math.max(0, voiced - dt);
        } else if ((voiced += dt) > 250) {
          log("call-barge", { by: "loudness", rms: +rms.toFixed(3), echo: +echo.toFixed(3) });
          interrupt(c);
          lastVoice = now;
        }
        if (now - lastLog > 500) {
          lastLog = now;
          log("call-level", { rms: +rms.toFixed(3), echo: +echo.toFixed(3), floor: +floor.toFixed(4) });
        }
      } else voiced = 0;
      raf.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function listen(c: Call, from?: number) {
    if (call.current !== c) return;
    if (from) c.turnStart = from;
    c.phase = "listening";
    c.since = performance.now();
    if (!from) c.turnStart = undefined;
    setLive("listening");
    setInterim("");
    // Live words while you talk, from the browser's own speech recognition (free). Whisper still makes the final text.
    const SR = srClass();
    if (SR) {
      const sr = new SR();
      sr.lang = c.lang;
      sr.interimResults = true;
      sr.continuous = true;
      c.srText = "";
      sr.onresult = (e) => setInterim((c.srText = Array.from(e.results, (r) => r[0].transcript).join(" ")));
      sr.onerror = () => {};
      try {
        sr.start();
        c.sr = sr;
      } catch {}
    }
  }

  // Barge-in by words: while the bot talks, the browser's recogniser also listens. Hearing the bot's own words
  // (its echo from the speakers) is normal; hearing two or more words the bot is not saying means you cut in.
  // This works even when loudness alone can't tell you from the echo (no headphones).
  function listenForCutIn(c: Call, said: string, lang: string) {
    const SR = srClass();
    if (!SR || !bargeRef.current) return;
    const mine = new Set(said.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
    // The recogniser sometimes turns the bot's echo into short junk ("హ య"): only words of 3+ letters count,
    // and only while the mic is clearly picking up more than the echo alone.
    const sr = new SR();
    sr.lang = lang;
    sr.interimResults = true;
    sr.continuous = true;
    sr.onresult = (e) => {
      const heard = Array.from(e.results, (r) => r[0].transcript).join(" ").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
      const fresh = heard.filter((w) => w.length >= 3 && !mine.has(w));
      if (fresh.length >= 2 && c.loud && c.phase === "speaking" && call.current === c) {
        log("call-barge", { by: "words", heard: heard.join(" ") });
        sr.abort();
        interrupt(c);
      }
    };
    sr.onerror = () => {};
    try {
      sr.start();
      c.sr = sr;
    } catch {}
  }

  function endTurn(c: Call, endedAt: number) {
    c.phase = "thinking";
    setLive("thinking");
    c.sr?.stop();
    // Your turn: from 0.4 s before your first word to now.
    const from = (c.turnStart ?? c.since) - 400;
    c.turnStart = undefined;
    onHeard(c, toWav(c.pcm.filter((x) => x.t >= from).map((x) => x.d), c.ac.sampleRate), endedAt);
  }

  function interrupt(c: Call) {
    stopSpeaking();
    c.sr?.abort();
    // Keep only what the bot really said before you cut in.
    const last = c.history[c.history.length - 1];
    if (last?.role === "bot") last.cut = Math.max(1, spokenRef.current);
    setVlines([...c.history]);
    listen(c, (c.loudSince ?? performance.now()) - 200); // keep the words you said while cutting in
  }

  async function onHeard(c: Call, audio: Blob, endedAt: number) {
    if (!bot || call.current !== c) return;
    micEl.current?.style.setProperty("--lv", "0");
    try {
      // The call's language is the one the bot last spoke: Whisper is pinned to it, and for Telugu/Hindi the
      // browser's own recogniser (Google, free, much better there) listens in it too.
      const callLang = c.lang.slice(0, 2);
      const res = await fetch(`/api/stt?langs=${bot.languages.join(",")}&lang=${callLang}`, { method: "POST", headers: { "Content-Type": audio.type || "audio/webm" }, body: audio });
      const stt = await res.json();
      if (!res.ok) throw new Error(stt.error ?? "Could not hear that");
      if (call.current !== c) return;
      // Whisper pinned to the call's language hears Telugu/Hindi well; the browser's recogniser fills in when it hears nothing.
      const sr = c.srText?.trim();
      if (!stt.text?.trim() && sr) stt.text = sr;
      log("call-heard", { text: stt.text, sr, call: callLang, lang: stt.lang, ms: stt.ms, bytes: audio.size });
      if (!stt.text?.trim()) return listen(c);
      // An English call where the browser's English recogniser heard no words at all, but Whisper wrote Telugu/Hindi:
      // that is noise or a "hmm" heard as Telugu letters, not a caller switching language.
      if (callLang === "en" && srClass() && !sr && stt.lang && stt.lang !== "en") return log("call-ignored", { text: stt.text, why: "noise heard as another language" }), listen(c);
      const t1 = performance.now();
      c.history.push({ role: "caller", text: stt.text });
      setVlines([...c.history]);
      setInterim("");
      const history = c.history.slice(-21, -1).map((l) => (l.cut ? { ...l, text: `${l.text.slice(0, l.cut)}… (cut off by the caller)` } : l));
      const r = await post<{ reply: string; step_id: string; ended: boolean }>("/api/turn", { bot, history, text: stt.text });
      if (call.current !== c) return;
      const t2 = performance.now();
      mark("voice");
      await botSays(r.reply, r.step_id, r.ended, [endedAt, t1, t2]);
      if (r.ended && c.phase === "speaking") return callEnd("The bot ended the call");
    } catch (e) {
      if (call.current !== c) return;
      say("", (e as Error).message || "That turn failed. Keep talking.", { err: true });
    }
    if (c.phase !== "listening") listen(c);
  }

  async function botSays(text: string, step_id: string, ended: boolean, t?: [number, number, number]) {
    const c = call.current;
    if (!c || !bot) return;
    c.history.push({ role: "bot", text, step_id, ended });
    c.lang = ttsLang(text, bot); // the caller answers in the language the bot just used
    log("call-bot", { bot: `${bot.name} v${bot.version}`, text, step: step_id, ended, lang: c.lang });
    setVlines([...c.history]);
    spokenRef.current = 0;
    setSpoken(0);
    c.phase = "speaking";
    c.since = performance.now();
    setLive("speaking");
    try {
      const sp = await speak(text, ttsLang(text, bot), (n) => {
        spokenRef.current = n;
        setSpoken(n);
      });
      if (t) setTiming({ hear: t[1] - t[0], think: t[2] - t[1], speak: sp.firstSoundMs, total: t[2] - t[0] + sp.firstSoundMs, left: sp.engine });
      log("call-timing", { engine: sp.engine, firstSound: Math.round(sp.firstSoundMs), ...(t && { hear: Math.round(t[1] - t[0]), think: Math.round(t[2] - t[1]) }) });
      listenForCutIn(c, text, ttsLang(text, bot));
      await sp.done;
      if (c.phase === "speaking") c.sr?.abort();
      if (c.phase === "speaking") await new Promise((r) => setTimeout(r, 200)); // let the room go quiet
    } catch (e) {
      say("", (e as Error).message || "Voice is off. The reply is shown as text.", { err: true });
    }
    spokenRef.current = text.length;
    setSpoken(text.length);
  }

  // ---------- the one input ----------
  const handleRef = useRef<(t: string) => void>(() => {});
  useEffect(() => {
    handleRef.current = handle;
  });
  async function handle(raw: string) {
    const t = raw.trim();
    clearTimeout(timer.current);
    setCounting(false);
    if (!t) return;
    if (busy) {
      // Said while busy: run it as soon as the current step ends. A hint or button keeps its own words.
      if (t !== inp.current?.value.trim()) later.current.push(t);
      else queued.current = true;
      return;
    }
    setText("");
    // A command said with a step still attached ("@Greet rehearse as a busy owner") is a command, not a change.
    const bare = mentionsIn(t);
    if (bare.found.length && /^(rehears|practi[cs]e|start the call|stop the call|end the call|hang up|go (to|back)|(show|open)( me)? (the |my )?(rules|facts|prompt|flow|stack|bots|export|sample)|take me|next$|back$|export|download|voice test|zoom|play the|undo|scroll)/i.test(bare.rest))
      return handle(bare.rest.replace(/\s+/g, " "));
    log("said", { scene, text: t, targets: targets.map((x) => x.token) });
    lastSaid.current = t;
    const stage = SAY_STAGE[scene];
    const pointing = !!sel;
    // Commands work with @mentions still in the box ("@Last reply export" → export).
    const low = (mentionsIn(t).rest.replace(/\s+/g, " ") || t).toLowerCase().replace(/[.!?,]+$/g, "").trim();
    const words = low.split(/\s+/).length;

    if (/^(clear|deselect|unselect|cancel)( (it|that|this|the selection|selection))?$/.test(mentionsIn(low).rest || low)) return setBox(""), say(t, "Cleared");
    // Screen controls are matched anywhere in the sentence and before navigation, so "drop the panel on the
    // left in the describe page" hides the panel instead of going to Describe.
    // They must start the sentence ("drop the panel on the left…"), so "a bot that shows solar panel offers" stays a brief.
    const PANEL = "(the )?(left |side )?(panel|sidebar|side ?bar|running order)\\b";
    if (new RegExp(`^(please )?(hide|close|collapse|drop|remove|minimi[sz]e|fold|get rid of) ${PANEL}`).test(low)) return setPanel(false), say(t, "Panel hidden. Say “show the panel” to bring it back.");
    if (new RegExp(`^(please )?(show|open|bring back|expand|unhide) ${PANEL}`).test(low))
      return setPanel(true), say(t, "Panel shown");
    const theme = low.match(/^(switch to |turn on |go |use )?(the )?(dark|light) (mode|theme)\b/)?.slice(2);
    if (theme) return toggleTheme(theme[1] as "dark" | "light"), say(t, `${theme[1] === "dark" ? "Dark" : "Light"} mode`);
    // On a call, what you say is the caller talking ("go ahead", "continue", "fix it!"), unless it's a clear command.
    const onCall = scene === "call";
    if (/^(play|show|watch)( me)? (the )?(sample|saved|demo) call$|^watch a bot break a rule$/.test(low)) return watchSample(t);
    if (/^(show |open )?(me )?(the |a )?(sample|example|demo)( bot)?$/.test(low)) return openSample(t);
    if (/^(speak|say|read) (the )?(replies|answers)( out loud| aloud)?$|^(voice|sound) on$|^unmute$/.test(low)) return setTalk(true), say(t, "The bot will speak its replies");
    if (/^(mute|stop speaking|voice off|sound off|quiet)$/.test(low)) return setTalk(false), say(t, "Muted");
    if (/^(zoom in|bigger|make it bigger)$/.test(low)) return go("blueprint"), setZoom((z) => Math.min(2.2, z + 0.4)), say(t, "Zoomed in on the flow");
    if (/^(zoom out|smaller|make it smaller)$/.test(low)) return go("blueprint"), setZoom((z) => Math.max(1, z - 0.4)), say(t, "Zoomed out");
    if (/^(fit|fit (it|the flow)|reset zoom|whole flow)$/.test(low)) return go("blueprint"), setZoom(1), say(t, "Whole flow");
    if (words <= 6 && /\b(start|make|create|build|begin)( a| an)? (new|another|fresh) (bot|one|agent)\b|^new bot$/.test(low)) return nav(t, "home");
    const scroll = low.match(/^(?:please )?(?:scroll|page|move|go)? ?(down|up)(?: a bit| more| please)?$|^(?:scroll|go|jump) (?:to )?(?:the )?(top|bottom|end|start)$/);
    if (scroll) {
      const el = document.querySelector<HTMLElement>(".scene.on");
      const dir = scroll[1] ?? scroll[2];
      const top = dir === "down" ? el!.scrollTop + el!.clientHeight * 0.7 : dir === "up" ? el!.scrollTop - el!.clientHeight * 0.7 : dir === "top" || dir === "start" ? 0 : el!.scrollHeight;
      el?.scrollTo({ top, behavior: "smooth" });
      return say(t, el && el.scrollHeight > el.clientHeight ? `Scrolled ${dir}` : "Everything already fits on the screen");
    }
    if (!onCall && NEXT.test(low)) return step(t, 1);
    if (!onCall && PREV.test(low)) return back(), say(t, "Back");
    // A screen name moves you only right after a "go/show/open" word, or said on its own ("rules", "the prompt").
    const target = low.match(/^(?:please |ok(?:ay)? |now )?(?:go to|go back to|back to|show(?: me)?|open|take me to|switch to|jump to|let me see)\s+(?:the |my )?(.+?)(?: page| screen| tab)?$/)?.[1]
      ?? (words <= 3 && (!onCall || /^(the |my )?(flow|rules|facts|prompt|stack|changes|voice test|export|my bots)( page)?$/.test(low))
        ? low.replace(/^(the |my )/, "").replace(/ (page|screen|tab)$/, "")
        : undefined); // on a call only a bare screen name counts; "go ahead" or "fix it!" are the caller talking
    if (target && target.split(" ").length <= 3) {
      const place = JOURNEY.find((j) => new RegExp(`^(${j.re.source})$`).test(target) || new RegExp(`^${j.name.toLowerCase()}$`).test(target));
      if (place && !(onCall && place.s === "call")) return goTo(t, place.s);
    }

    if (backRe.test(t)) return back(), say(t, "Back");
    if (undoRe.test(t) && bot) return doUndo(t);
    if (/^(dark|light)( mode)?$/i.test(t)) return toggleTheme(t.toLowerCase().startsWith("dark") ? "dark" : "light");
    if ((scene === "fix" || (scene === "call" && /^replay/i.test(low))) && replayRe.test(low)) return replay(t);
    if (scene === "voice" && stopRe.test(t)) return callEnd();
    if (scene === "voice" && /^(turn off|no|stop|disable) (the )?(interruptions?|cutting in|cut in)$/.test(low)) return setBarge(false), say(t, "Interruptions off: the bot finishes every line");
    if (scene === "voice" && /^(turn on|allow|enable|let me) (the )?(interruptions?|interrupt|cut in|cutting in)$/.test(low)) return setBarge(true), say(t, "Interruptions on: talk over the bot to cut in");
    if (scene === "voice" && /^(start|begin|ring|make)( the| a)? call$|^(start|call me|call)$/i.test(low)) return void callStart();
    if (/^(stop|end|hang up|cut)( the)? call[.!]?$|^hang up[.!]?$/i.test(t))
      return scene === "call" || scene === "fix" ? (clearSample(), stopSpeaking(), go("call"), setReport(true), say(t, "Call stopped. Here is how it went.")) : say(t, "No call is running right now.");
    // For docs/results.md: a table of every own bot's measured times, ready to paste.
    if (/^copy (my |the )?(timings|times|results|numbers)$/.test(low)) {
      const min = (a?: number, b?: number) => (a && b ? `${((b - a) / 60000).toFixed(1)}` : "–");
      const rows = listDrafts().filter((d) => d.id !== SAMPLE_ID && d.times?.start).map((d) => {
        const x = d.times!;
        return `| ${new Date(x.start!).toISOString().slice(0, 10)} | ${d.bot?.name ?? d.interview?.name} | ${min(x.start, x.built)} | ${min(x.start, x.rehearsed)} | ${min(x.start, x.broke)} | ${min(x.start, x.fixed)} | ${min(x.start, x.exported)} | ${d.log?.length ?? 0} |`;
      });
      const md = ["| Date | Bot | Built (min) | First test call | First rule break caught | Fixed + retested | Exported | Changes |", "|---|---|---|---|---|---|---|---|", ...rows].join("\n");
      navigator.clipboard?.writeText(md).catch(() => {});
      return say(t, rows.length ? `Copied timings for ${rows.length} bots. Paste them into docs/results.md.` : "No timings yet: build a bot of your own first.");
    }
    const copyCmd = low.match(/^copy (the )?(prompt|vapi|retell)/);
    if (copyCmd && bot) return copyAs(copyCmd[2]), say(t, `Copied the ${copyCmd[2] === "prompt" ? "prompt" : `${copyCmd[2]} command`}`);
    if (downloadRe.test(t) && bot && !onCall) {
      const x = EXPORTS.find((e) => low.includes(e.id) || (e.id === "json" && /\b(backup|json|everything)\b/.test(low))) ?? EXPORTS[0];
      return exportAs(x.id), say(t, `Downloaded ${x.name}`);
    }
    const opening = low.match(/^open (?:the |my )?(.+)$/)?.[1];
    if (scene === "bots" && opening) {
      const list = listDrafts();
      const m = /^first( one| bot)?$/.test(opening) ? list[0] : list.find((d) => (d.bot?.name ?? d.interview?.name ?? "").toLowerCase().includes(opening.replace(/ bot$/, "")));
      if (m) return open(m), say(t, `Opened ${m.bot?.name ?? m.interview?.name}`);
    }

    // On a live voice call the mic is the caller. Words typed or pasted (a Wispr key pressed by habit) must not edit the bot.
    if (scene === "voice" && call.current) return say(t, "You're on a live call: just talk, the mic is listening. Say “end the call” to change the bot.", { err: true });

    const g = guessIntent(stage, t, pointing);
    if (g?.intent === "navigate" && g.tab && !onCall) return nav(t, g.tab);
    if (scene === "questions" && moreRe.test(t)) return askMore(t);

    if ((scene === "describe" || scene === "bots") && words < 4) return say(t, "Tell me a bit more: who does the bot call, and why?", { err: true });
    if (scene === "describe" || scene === "bots") return brief(t);
    if (scene === "questions" && ((words <= 4 && /^(rehears|call it|test it|try it|show|open|go to|take me)/.test(low)) || (words < 3 && g?.intent !== "build_now")))
      return say(t, "Answer the questions in one go, or say “just build it”.", { err: true });
    if (scene === "questions") return build(t, g?.intent === "build_now" ? "" : t);
    if (!bot) return brief(t);
    if ((scene === "call" || scene === "fix") && g?.intent === "caller_turn" && !pointing) {
      if (scene === "fix") go("call");
      say(t, "…");
      return void callerTurn(t);
    }
    if (g?.intent === "rehearse_start") return startCall(t, personaOf(t));

    say(t, "…");
    const r = await run(pointing ? "Changing it" : "Working it out", () =>
      post<SayRes>("/api/say", {
        stage, bot, selection: sel ? { kind: sel.kind, id: sel.id, text: sel.text } : undefined,
        text: targets.length > 1 ? `(This is about: ${targets.map((x) => `${x.token.slice(1)} = ${x.label}`).join("; ")}) ${t}` : t,
      }).catch((e) => {
        // The sample's own fix still works when the free AI is busy.
        const f = /refund|callback|call ?back|manager|free/i.test(t) && (sel?.kind === "turn" || scene === "call") ? sampleFix(bot) : null;
        return f ? ({ intent: "edit", ...f } as SayRes) : Promise.reject(e);
      }),
    );
    if (!r) return;
    if (r.intent === "edit" && r.bot) return applyEdit(t, r as EditResult);
    if (r.intent === "navigate" && r.tab) return nav(t, r.tab);
    if (r.intent === "rehearse_start") return startCall(t, r.persona);
    if (r.intent === "caller_turn") return void callerTurn(t);
    if (r.intent === "brief") return brief(t);
    if (r.intent === "question") return say(t, r.answer ?? "", { ans: true });
    say(t, "Not sure what to do with that. Try one of the hints.", { err: true });
  }

  function goTo(t: string, s: Scene) {
    if (s === "describe") return nav(t, "home");
    if (s === "questions" && !draft?.interview) return say(t, "No questions yet. Describe a bot first.", { err: true });
    if (s === "bots") return go("bots"), say(t, "My bots");
    if (s === "proof") return go("proof"), say(t, "Proof: my old way next to Rehearse");
    if (s !== "questions" && !bot) return say(t, "Build the bot first", { err: true });
    if (s === "call") return lines.length ? (go("call"), say(t, "Back to the call")) : startCall(t);
    go(s);
    say(t, `Showing ${JOURNEY.find((j) => j.s === s)?.name}`);
  }
  function step(t: string, dir: 1 | -1) {
    // Same order as the panel: Flow → Rules → Facts → Prompt → Stack → Rehearse → (Fix) → Voice test → Export.
    const order: string[] = JOURNEY.map((j) => j.s).filter((s) => s !== "bots" && s !== "proof");
    const here = Math.max(0, order.indexOf(scene === "building" ? "questions" : scene));
    const to = order[Math.min(order.length - 1, Math.max(0, here + dir))] as Scene;
    if (to === scene) return say(t, "This is the last step");
    if (scene === "questions" && dir === 1) return build(t, "");
    goTo(t, to);
  }

  function nav(t: string, tab: Tab) {
    if (tab === "back") return back(), say(t, "Back");
    if (tab === "sample") return openSample(t);
    if (tab === "home") {
      // The open bot stays open (and in My bots); describing something new starts a new bot.
      go("describe");
      return say(t, bot ? `Describe a new bot. ${bot.name} is still open: say “back to the flow”.` : "New bot");
    }
    const s = TAB_SCENE[tab];
    if (!s) return;
    if (s !== "bots" && !bot) return say(t, "Build the bot first", { err: true });
    if (s === "call") return startCall(t);
    go(s);
    say(t, `Showing ${tab === "flow" ? "the flow" : tab}`);
  }

  // The saved call always runs on a fresh copy of the sample bot, so old edits never show "Broke rule 0".
  function watchSample(t: string) {
    open({ id: SAMPLE_ID, brief: SAMPLE_BRIEF, answers: [], bot: SAMPLE_BOT, updated: 0 });
    playSample(t, SAMPLE_BOT);
  }

  function openSample(t: string) {
    open(getDraft(SAMPLE_ID) ?? { id: SAMPLE_ID, brief: SAMPLE_BRIEF, answers: [], bot: SAMPLE_BOT, updated: 0 });
    say(t, "The sample bot. Say “play the sample call” to watch a rehearsal break a rule.");
  }

  // The saved rehearsal: plays line by line, no AI needed, ends on a broken rule.
  function playSample(t: string, b: Bot | undefined = bot) {
    if (!b) return;
    setPersona("Telugu caller, asks about refunds");
    setLines([]);
    setFix(null);
    setVig("");
    go("call");
    say(t, "Playing the saved sample call");
    clearSample();
    SAMPLE_CALL.forEach((l, i) =>
      sampleTimers.current.push(window.setTimeout(() => {
        if (sceneRef.current !== "call") return; // you left the call: stop playing it
        setLines(SAMPLE_CALL.slice(0, i + 1));
        if (l.broken) {
          setVig("bad");
          lastTurn.current = `Caller: ${SAMPLE_CALL[i - 1].text}\nBot: ${l.text}`;
          if (!inp.current?.value.trim()) setBox("@Last reply ");
          say(t, "Broke rule 1. Say the fix, e.g. “if they ask for a refund, say the trial is free and offer a manager callback”.");
        }
      }, 600 + i * 1700)), // slow enough to read each line
    );
  }

  function open(d: Draft) {
    brokeV.current = undefined;
    epoch.current++;
    clearSample();
    lastTurn.current = "";
    store(d);
    setUndo([]);
    setLines([]);
    setChanged(null);
    go(d.bot ? "blueprint" : "questions");
    say("", `Opened ${d.bot?.name ?? d.interview?.name ?? "the bot"}`);
  }

  function exportAs(id: string) {
    const x = EXPORTS.find((e) => e.id === id);
    if (bot && x?.file) download(...x.file(bot)), mark("exported");
  }
  const [copied, setCopied] = useState("");
  function copyAs(id: string) {
    const x = EXPORTS.find((e) => e.id === id);
    if (!bot || !x?.copy) return;
    navigator.clipboard?.writeText(x.copy(bot)).then(() => {
      mark("exported");
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    }, () => say("", "The browser blocked copying. Use Download instead.", { err: true }));
  }

  function toggleTheme(t?: string) {
    const next = t ?? (theme === "dark" ? "light" : "dark");
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("rh-theme", next);
    } catch {}
  }

  useEffect(() => {
    if (busy) return;
    if (queued.current) {
      queued.current = false;
      handle(inp.current?.value ?? "");
    } else if (later.current.length) {
      const next = later.current.shift()!;
      setBox(next);
      handle(next);
    }
  });

  // Some dictation apps set the value without an input event: catch that too.
  useEffect(() => {
    const id = setInterval(() => {
      const el = inp.current;
      if (el && el.value !== text && el.value.length - text.length > 1) {
        setText(el.value);
        setCounting(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => handleRef.current(el.value), 700);
      }
    }, 300);
    return () => clearInterval(id);
  });

  // Wispr pastes a whole sentence at once: send it after a short countdown. Typing waits for Enter.
  function onInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const v = e.currentTarget.value;
    const ie = e.nativeEvent as InputEvent;
    const jump = v.length - text.length;
    log("input", { type: ie.inputType, len: v.length, jump, scene });
    setText(v);
    clearTimeout(timer.current);
    // Auto-send only for a paste or dictation (Wispr pastes the whole sentence), not for autocorrect or a
    // tapped word suggestion on a phone, which change a few letters at a time.
    if (ie.inputType === "insertFromPaste" || (ie.inputType !== "insertReplacementText" && jump >= 12)) {
      setCounting(true);
      timer.current = setTimeout(() => handleRef.current(v), 700);
    } else setCounting(false);
  }
  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handle(text);
    } else if (e.key === "Escape") {
      if (counting) {
        clearTimeout(timer.current);
        setCounting(false);
      } else if (sel) clearMentions();
      else if (!text) back();
    } else if (e.key === "Backspace" || e.key === "Delete") {
      // An @mention goes away as one piece, like a chip, not letter by letter.
      const box = e.currentTarget, at = box.selectionStart;
      if (at !== box.selectionEnd) return;
      for (const m of mentionsIn(text).found)
        for (let i = text.indexOf(m.token); i >= 0; i = text.indexOf(m.token, i + 1)) {
          const end = i + m.token.length, endSp = text[end] === " " ? end + 1 : end;
          if (e.key === "Backspace" ? at > i && at <= endSp : at >= i && at < end) {
            e.preventDefault();
            setBox(text.slice(0, i) + text.slice(endSp));
            requestAnimationFrame(() => inp.current?.setSelectionRange(i, i));
            return;
          }
        }
    }

  }

  function pickStep(id: string, add = false, dbl = false) {
    if (!bot) return;
    const i = bot.flow.steps.findIndex((s) => s.id === id);
    attach(mentionables.find((m) => m.kind === "step" && m.id === id)?.token ?? `@${bot.flow.steps[i].label}`, add, dbl);
  }

  // ---------- render ----------
  const stepNo = (id?: string) => (bot && id ? bot.flow.steps.findIndex((s) => s.id === id) + 1 : 0);
  useEffect(() => {
    const m = mainEl.current;
    if (!m) return;
    const check = () => {
      const el = m.querySelector<HTMLElement>(".scene.on");
      setMore(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 12);
    };
    const t = setTimeout(check, 700); // after the screen's entrance
    m.addEventListener("scroll", check, true);
    addEventListener("resize", check);
    const ro = new ResizeObserver(check);
    m.querySelectorAll(".scene").forEach((x) => ro.observe(x));
    return () => (clearTimeout(t), m.removeEventListener("scroll", check, true), removeEventListener("resize", check), ro.disconnect());
  }, [scene, bot, lines.length, report]);
  const path = lines.filter((l) => l.role === "bot" && l.step_id).map((l) => l.step_id!);
  const lastBot = [...lines].reverse().find((l) => l.role === "bot");
  const badStep = lastBot?.broken?.length ? lastBot.step_id : undefined;
  const progIdx = PROGRESS.findIndex(([, s]) => s === (scene === "building" ? "questions" : ["rules", "knowledge", "prompt", "stack"].includes(scene) ? "blueprint" : scene));
  const reach = (s: Scene) => s === "describe" || (s === "questions" ? !!draft?.interview : !!bot);
  const u = draft?.interview?.understood;
  const hints = scene === "voice" && live !== "off" ? ["end the call", barge ? "turn off interruptions" : "let me interrupt"] : scene === "call" && report ? ["rehearse again", "back to the flow"] : scene === "call" && sel ? ["if they ask for a refund, offer a manager callback instead", "replay", "stop the call"] : HINTS[scene];

  return (
    <>
      <header className="top">
        <div className="brand" role="button" tabIndex={0} aria-label="Rehearse home" onClick={() => nav("", "home")} onKeyDown={(e) => e.key === "Enter" && nav("", "home")}>
          <span className="logo"><I d={IC.stage} w={1.8} /></span>
          <span className="word">Rehearse</span>
        </div>
        <div className="prog">
          <div className="segs">
            {PROGRESS.map(([name, s], k) => (
              <button key={s} disabled={!reach(s)} className={k < progIdx ? "done" : k === progIdx ? "now" : ""} title={name} aria-label={name}
                onClick={() => (s === "call" ? (lines.length ? go("call") : startCall("rehearse")) : go(s))}>
                <i />
              </button>
            ))}
          </div>
          <span className="stepname"><small>{progIdx + 1}/7</small>{PROGRESS[progIdx]?.[0]}</span>
        </div>
        <div className="topr">
          <button className={`iconbtn pathbtn ${panel ? "on" : ""}`} onClick={() => setPanel(!panel)} aria-label={panel ? "Hide the running order" : "Show the running order"} aria-expanded={panel}><I d={IC.path} /></button>
          <button className="pillbtn" onClick={() => goTo("", "bots")}><I d={IC.bots} />My bots</button>
          <button className="iconbtn" onClick={() => toggleTheme()} aria-label="Switch light or dark"><I d={theme === "dark" ? IC.sun : IC.moon} /></button>
        </div>
      </header>

      <nav className={`journey ${panel ? "" : "closed"}`} aria-label="Where you are">
        <div className="jt">Running order<button onClick={() => setPanel(!panel)} aria-label={panel ? "Hide the path" : "Show the path"}>{panel ? "‹" : "›"}</button></div>
        {JOURNEY.map((j) => {
          const here = scene === j.s || (scene === "building" && j.s === "questions");
          const ok = j.s === "describe" || j.s === "bots" || j.s === "proof" || (j.s === "questions" ? !!draft?.interview : !!bot);
          return (
            <button key={j.s} className={`${j.sub ? "sub" : ""} ${here ? "here" : ""}`} disabled={!ok} title={ok ? undefined : "Describe a bot or open the sample first"} onClick={() => (goTo("", j.s), innerWidth < 1100 && setPanel(false))}>
              <i />{j.name}
              {bot && j.s === "rules" && <small>{bot.rules.length}</small>}
              {bot && j.s === "knowledge" && <small>{bot.knowledge.length}</small>}
              {bot && j.s === "blueprint" && <small>{bot.flow.steps.length} steps</small>}
            </button>
          );
        })}
        <div className="jh">{bot ? "Say “next”, “back” or “go to rules”." : "Describe a bot, or say “show me the sample”, to open the rest."}</div>
      </nav>

      <main ref={mainEl} onClick={() => panel && innerWidth < 1100 && setPanel(false)}>
        <section className={`scene hero ${scene === "describe" ? "on" : ""}`}>
          <div className="herogrid">
            <div className="herotext">
              {bot && (
                <button className="resume" onClick={() => goTo("", "blueprint")}>
                  <small>Open now</small>{bot.name} · v{bot.version} <span>Back to it →</span>
                </button>
              )}
              <div className="eyebrow">A rehearsal room for voice bots</div>
              <h1 className="h1s">Talk your voice bot <em>into shape.</em></h1>
              <p className="sub0">Say what the bot should do, in English, हिंदी, తెలుగు or a mix. Then rehearse a call, catch the line that breaks a rule, and fix it by saying so.</p>
              <div className="ctas">
                <button className="btn" onClick={() => watchSample("watch a bot break a rule")}>Watch a bot break a rule</button>
                <span>or hold your Wispr Flow key and talk</span>
              </div>
              <ol className="jobs" aria-label="Three jobs for your voice, one box">
                <li><span><b>Describe</b><i> the bot, the way you’d explain it to a new hire</i></span></li>
                <li><span><b>Play the caller</b><i> and hear where the bot slips</i></span></li>
                <li><span><b>Say the fix</b><i> right at the line that broke a rule</i></span></li>
              </ol>
            </div>
            {/* The intro: messy speech on a script page, the filler gets crossed out, a clean bot comes out. */}
            <div className="script" aria-hidden key={ix}>
              <div className="scripthead"><span>Take {ix + 1} of {INTROS.length}</span><span>{INTROS[ix].lang}</span></div>
              <p className="said">
                {INTROS[ix].words.map(([w, cut], i) => (
                  <span key={i} className={cut ? "f" : "k"} style={{ ["--i" as string]: i }}>{w} </span>
                ))}
              </p>
              <ol className="built">
                {INTROS[ix].steps.map((x, i) => <li key={x} style={{ ["--i" as string]: i }}><small>Scene {i + 1}</small>{x}</li>)}
              </ol>
              <b className="pencil">{INTROS[ix].rule}!</b>
            </div>
          </div>
        </section>

        <section className={`scene ${scene === "questions" ? "on" : ""}`}>
          {draft?.interview && (
            <>
              <div className="eyebrow">{draft.interview.name} · {draft.interview.questions.length} quick questions</div>
              <h2>Answer them all in one go.</h2>
              {u?.goal && <div className="known"><I d={IC.check} />{u.goal}</div>}
              <ol className="bigq">
                {draft.interview.questions.map((q, i) => (
                  <li key={q.id + i} style={{ ["--d" as string]: `${i * 0.08}s` }} className={draft.answers.length ? "ok" : ""}>
                    <span className="qn">{i + 1}</span>
                    <div><b>{q.q}</b><div className="qa">{q.hint}</div></div>
                  </li>
                ))}
              </ol>
              {u && (u.languages.length > 0 || u.never.length > 0) && (
                <div className="known2">
                  {u.languages.map((l) => <span key={l}>{langName(l)}</span>)}
                  {u.never.map((r) => <span key={r} className="bad">Never: {r}</span>)}
                  {u.always.map((r) => <span key={r} className="ok">Always: {r}</span>)}
                </div>
              )}
            </>
          )}
        </section>

        <section className={`scene ${scene === "building" ? "on" : ""}`}>
          <h2>Setting the stage</h2>
          {/* Staged ticks while the AI works (about 2 s), so the wait feels like progress. */}
          <ul className="stages" key={String(scene === "building")}>
            {["Reading what you said", "Drawing the call flow", "Writing the rules", "Collecting the facts", "Compiling the prompt"].map((x, i) => (
              <li key={x} style={{ ["--i" as string]: i }}>{x}</li>
            ))}
          </ul>
        </section>

        <section className={`scene ${scene === "blueprint" ? "on" : ""}`}>
          {bot && (
            <>
              <div className="eyebrow">{bot.name} · v{bot.version} · {bot.languages.map(langName).join(" · ")} · click a step, then say the change</div>
              <div className={`flowbig ${zoom > 1 ? "zoomed" : ""}`} key={`${bot.id}-${scene}`}>
                <div style={{ width: `${zoom * 100}%` }}>
                  <Flow bot={bot} chg={changed?.steps} sel={targets.filter((x) => x.kind === "step").map((x) => x.id!)} onPick={pickStep} />
                </div>
              </div>
              <div className="chg">{changed && <span>{changed.summary}</span>}</div>
            </>
          )}
        </section>

        <section className={`scene ${scene === "rules" ? "on" : ""}`}>
          {bot && (
            <>
              <div className="eyebrow">say “drop rule 2” · “keep 3” · “back to the flow”</div>
              <h2>{bot.rules.length} rules it must follow</h2>
              <div className="rgrid">
                {bot.rules.map((r, i) => (
                  <button key={r.id} style={{ ["--d" as string]: `${i * 0.05}s` }}
                    className={`rcard ${r.suggested ? "sug" : ""} ${r.kind === "always" ? "ok" : ""} ${targets.some((x) => x.id === r.id) ? "sel" : ""} ${changed?.rules.includes(r.id) ? "chg" : ""}`}
                    onClick={(e) => attach(`@Rule ${i + 1}`, e.shiftKey || e.metaKey)} onDoubleClick={() => attach(`@Rule ${i + 1}`, true, true)}>
                    <span className="ri"><I d={r.kind === "never" ? IC.x : IC.check} /></span>
                    <div>
                      <b>{i + 1}. {r.kind === "never" ? "Never" : "Always"}: {r.text}</b>
                      <small>{r.source === "suggested" ? "Suggested · say keep or drop" : r.source === "brief" ? "From your brief" : "From your answers"}</small>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className={`scene ${scene === "knowledge" ? "on" : ""}`}>
          {bot && (
            <>
              <div className="eyebrow">say “add: …” · “remove fact 2” · “back to the flow”</div>
              <h2>What it knows</h2>
              <div className="facet">
                {bot.knowledge.length ? (
                  <ol>{bot.knowledge.map((k, i) => <li key={k.id} style={{ ["--i" as string]: i }} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && attach(`@Fact ${i + 1}`, e.shiftKey)} className={changed?.knowledge.includes(k.id) ? "chg" : ""} onClick={(e) => attach(`@Fact ${i + 1}`, e.shiftKey || e.metaKey)} onDoubleClick={() => attach(`@Fact ${i + 1}`, true, true)}>{k.text}</li>)}</ol>
                ) : <p className="empty">No facts yet. Say your prices, plans or policies.</p>}
                {bot.tools.some((t) => t.enabled) && <p className="note">Tools: {bot.tools.filter((t) => t.enabled).map((t) => TOOL_SHELF[t.id] ?? t.id).join(" · ")}</p>}
              </div>
            </>
          )}
        </section>

        <section className={`scene ${scene === "prompt" ? "on" : ""}`}>
          {bot && (
            <>
              <div className="eyebrow">built from the flow, rules and facts · change it by voice</div>
              <h2>The prompt it runs on</h2>
              <div className="facet"><pre>{bot.prompt}</pre></div>
            </>
          )}
        </section>

        <section className={`scene ${scene === "stack" ? "on" : ""}`}>
          {bot && (
            <>
              <div className="eyebrow">hears · thinks · speaks</div>
              <h2>Stack &amp; speed</h2>
              <div className="facet">
                <div className="stk">
                  <div><small>Hears</small><b>Whisper large v3 turbo</b><span>Groq free tier · Telugu, Hindi, English</span></div>
                  <div><small>Thinks</small><b>{bot.stack.llm.split(":").slice(1).join(":")}</b><span>{bot.stack.llm.split(":")[0]} free tier</span></div>
                  <div><small>Speaks</small><b>Browser voices</b><span>free · your device’s English, Hindi and Telugu voices</span></div>
                </div>
                <p className="note">{timing ? `Last voice test: ${(timing.total / 1000).toFixed(2)} s to the first sound.` : "Real reply times show here after a voice test. Say “voice test”. For production, the same bot runs on Deepgram nova-3 and Murf Falcon with your own keys."}</p>
              </div>
            </>
          )}
        </section>

        <section className={`scene callscene ${scene === "call" ? "on" : ""} ${report || lastBot?.ended ? "reported" : ""}`}>
          {bot && (
            <>
              <span className="persona"><I d={IC.target} />You are the caller{persona ? ` · ${persona}` : ""} · {talk ? "bot speaks out loud · say “mute”" : "say “speak the replies” to hear the bot"}</span>
              <div className="minimap"><Flow bot={bot} mini lit={path} cur={lastBot?.step_id} bad={badStep} good={lastBot?.fixed ? lastBot.step_id : undefined} /></div>
              <div className="subs" ref={subsEl} onScroll={(e) => hideCut(e.currentTarget)}>
                {lines.map((l, i) => (
                  <div key={i} className={`sub ${l.role === "caller" ? "me" : ""} ${l.broken?.length ? "bad" : ""}`}>
                    <small>{l.role === "caller" ? "You · caller" : `Bot · step ${stepNo(l.step_id)}`}</small>
                    <p>{l.text}</p>
                    {l.broken?.map((b) => (
                      <div key={b.rule_id}><span className="stamp"><I d={IC.shield} />Broke rule {bot.rules.findIndex((r) => r.id === b.rule_id) + 1} · {bot.rules.find((r) => r.id === b.rule_id)?.text}</span><em>{b.why}</em></div>
                    ))}
                    {l.fixed && <span className="stamp okk"><I d={IC.check} />Fixed · rule kept</span>}
                    {l.ended && <em>Call ended</em>}
                  </div>
                ))}
              </div>
              {(report || lastBot?.ended) && lines.length > 1 && <CallReport bot={bot} lines={lines} again={() => startCall("rehearse again", persona || undefined)}
                fix={() => { setReport(false); if (lastTurn.current) setBox("@Last reply "); inp.current?.focus(); say("", "Say the fix for that line, then “replay”."); }} />}
            </>
          )}
        </section>

        <section className={`scene changes ${scene === "fix" ? "on" : ""}`}>
          {bot && (
            <>
              <div className="eyebrow">{bot.name} · now v{bot.version}</div>
              <h2>{fix ? "Fixed where it broke" : "Changes"}</h2>
              {fix && (
                <div className="fixcard">
                  <div className="fxn">
                    <span className="nb">{stepNo(fix.step) || "•"}</span>
                    <b>{bot.flow.steps.find((s) => s.id === fix.step)?.label ?? "Reply"}</b>
                    {fix.rule && <span className="rchip">{fix.rule}</span>}
                  </div>
                  <div className="fxr was"><small>Before</small><div><p><s>{fix.before}</s></p></div></div>
                  <div className="fxr now"><small>Now</small><div><p>{fix.summary}</p></div></div>
                  <div className="fxbtns">
                    <button className="btn" onClick={() => handle("replay")}>Replay the same line</button>
                    <button className="btn ghost" onClick={() => handle("undo")}>Undo this fix</button>
                  </div>
                </div>
              )}
              {draft?.log?.length ? (
                <ol className="vlog">
                  {[...draft.log].reverse().map((c, i) => (
                    <li key={c.v + "-" + i}>
                      <b>v{c.v}</b>
                      <div>
                        <p>{c.summary}</p>
                        {c.before && <small>Fixed a reply{c.rule ? ` that broke ${c.rule.toLowerCase()}` : ""}: <s>{c.before}</s></small>}
                      </div>
                      {i === 0 && undo.length > 0 && <button className="btn ghost" onClick={() => handle("undo")}>Undo</button>}
                    </li>
                  ))}
                  <li><b>v1</b><div><p>Built from your description.</p></div></li>
                </ol>
              ) : (
                !fix && (
                  <div className="empty2">
                    <p>No changes yet. Every change you say shows up here, with what it was before, so you can undo it.</p>
                    <ol>
                      <li><b>Change a step</b><span>Click a step on the flow, then say what it should do instead.</span><button className="btn ghost" onClick={() => goTo("", "blueprint")}>Open the flow</button></li>
                      <li><b>Fix a bad reply</b><span>Rehearse a call. When a line breaks a rule, say the fix.</span><button className="btn" onClick={() => startCall("rehearse")}>Rehearse a call</button></li>
                    </ol>
                  </div>
                )
              )}
            </>
          )}
        </section>

        <section className={`scene voicescene ${scene === "voice" ? "on" : ""}`}>
          {bot && (
            <>
              <span className="live"><i /><span>Live voice test of <b>{bot.name}</b> v{bot.version}<em> · Whisper (Groq) → {bot.stack.llm.split(":").slice(1).join(":")} → free voice</em></span></span>
              {/* Voices on the left, the call in the middle, call behaviour on the right. */}
              <div className="callrow">
                <div className="vpick">
                  {[...new Set(bot.languages.map(srLang))].map((l) => <VoicePick key={l} lang={l as SpeakLang} />)}
                </div>
                <div className={`callctl ${live}`} ref={micEl}>
                  <button className={`micbtn ${live}`} aria-label={live === "off" ? "Start the call" : "End the call"} title={live === "off" ? "Start the call" : "End the call"}
                    // Right after you click, the pointer is still on the button: show the call, not "hang up", until it leaves once.
                    onClick={(e) => (e.currentTarget.dataset.fresh = "1", live === "off" ? callStart() : callEnd())}
                    onMouseLeave={(e) => delete e.currentTarget.dataset.fresh}>
                    {live === "off" ? <I d={IC.phone} /> : (
                      <>
                        <span className="bars" aria-hidden><i /><i /><i /><i /><i /></span>
                        <span className="hang" aria-hidden><I d={IC.phone} /></span>
                      </>
                    )}
                  </button>
                  <div className="vstate" aria-live="polite">
                    {{ off: "Start the call", listening: "Listening…", thinking: "Thinking…", speaking: "Bot speaking" }[live]}
                  </div>
                </div>
                <div className="vopts">
                  <button className={`switch ${barge ? "on" : ""}`} role="switch" aria-checked={barge} onClick={() => setBarge(!barge)}><i />Let me cut in</button>
                  <small>{barge ? "Talk over the bot and it stops to listen." : "The bot always finishes its line."}</small>
                </div>
              </div>
              {live === "off" && !vlines.length && (
                <p className="teach">
                  <b>How real calls go:</b> people pause, change their mind, and talk over the bot. Try it: start talking while the bot is
                  mid-sentence and it stops to listen (that is called <i>barge-in</i>). Say “turn off interruptions” to compare. Headphones help.
                </p>
              )}
              {(vlines.length > 0 || interim) && (
                <div className="convo" ref={convoEl}>
                  {vlines.map((l, i) => {
                    const now = l.role === "bot" && i === vlines.length - 1 && live === "speaking";
                    const upto = now ? spoken : l.text.length;
                    return (
                      <div key={i} className={`sub ${l.role === "caller" ? "me" : ""}`}>
                        <small>{l.role === "caller" ? "You" : `Bot · step ${stepNo(l.step_id)}`}{l.cut ? " · you cut in" : ""}</small>
                        {l.cut ? <p>{l.text.slice(0, l.cut).trimEnd()}<span className="cutmark"> —</span></p>
                          : <p>{l.text.slice(0, upto)}{upto < l.text.length && <span className="todo">{l.text.slice(upto)}</span>}</p>}
                      </div>
                    );
                  })}
                  {(interim || live === "thinking") && (
                    <div className="sub me live-line"><small>You · live</small><p>{interim || "…"}</p></div>
                  )}
                </div>
              )}
              {timing && <div className="big sm narrow"><b>{(timing.total / 1000).toFixed(2)} s</b><span>from the end of your sentence to the bot’s first sound (last turn)</span></div>}
              {timing && (
                <>
                  <div className="bar narrow">
                    <span style={{ background: "var(--s2)", flexGrow: timing.hear }}>{(timing.hear / 1000).toFixed(2)}s</span>
                    <span style={{ background: "var(--s3)", flexGrow: timing.think }}>{(timing.think / 1000).toFixed(2)}s</span>
                    {timing.speak > 0 && <span style={{ background: "var(--s4)", flexGrow: timing.speak }}>{(timing.speak / 1000).toFixed(2)}s</span>}
                  </div>
                  <div className="legend narrow">
                    <span><i style={{ background: "var(--s2)" }} />Hearing · pause + Whisper</span>
                    <span><i style={{ background: "var(--s3)" }} />Thinking · Groq</span>
                    <span><i style={{ background: "var(--s4)" }} />First sound · {timing.left ?? "voice"}</span>
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section className={`scene ${scene === "export" ? "on" : ""}`}>
          {bot && (
            <>
              <div className="eyebrow">{bot.name} · v{bot.version} · {bot.flow.steps.length} steps · {bot.rules.length} rules</div>
              <h2>Take it with you.</h2>
              <p className="xlead">No platform imports a file from a dashboard, so each option says exactly where it goes.</p>
              <ol className="xlist">
                {EXPORTS.map((x, i) => (
                  <li key={x.id} style={{ ["--d" as string]: `${i * 0.05}s` }}>
                    <div><b>{x.name}</b><p>{x.how}</p></div>
                    <span className="xbtns">
                      {x.copy && <button className={i === 0 ? "btn" : "btn ghost"} onClick={() => copyAs(x.id)}>{copied === x.id ? "Copied ✓" : x.copyLabel}</button>}
                      {x.file && <button className="btn ghost" onClick={() => exportAs(x.id)}><I d={IC.dl} />Download</button>}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <section className={`scene proofscene ${scene === "proof" ? "on" : ""}`}>
          <div className="eyebrow">from my own work logs · counts only, no client data</div>
          <h2>Proof</h2>
          {scene === "proof" && <Proof />}
        </section>

        <section className={`scene ${scene === "bots" ? "on" : ""}`}>
          <div className="eyebrow">saved in this browser · no sign-in</div>
          <h2>My bots</h2>
          <BotList on={scene === "bots"} open={open} current={draft?.id} add={() => handle("start a new bot")} />
        </section>

        </main>
      <SidePanel scene={scene} bot={bot ?? null} sel={sel} lines={lines} vlines={vlines} timing={timing} undo={undo} draft={draft} />
      <div className={`vig ${vig}`} />

      {more && (
        <button className="more" onClick={() => { const el = document.querySelector<HTMLElement>(".scene.on"); el?.scrollBy({ top: el.clientHeight * 0.7, behavior: "smooth" }); }}>
          More below <span aria-hidden>↓</span>
        </button>
      )}
      <div className="mic" ref={micBox}>
        <div className={`cap ${heard ? "on" : ""} ${heard?.err ? "err" : ""}`}>
          {heard?.q && <><span className="hl">Heard</span><span className="lang">{langOf(heard.q)}</span><q>{heard.q}</q></>}
          {heard && <b className={heard.ans ? "ans" : ""}>{busy ? <span className="dots"><i /><i /><i /></span> : heard.res}</b>}
        </div>
        <div className="pill">
          <div className="field">
            {/* Same text behind the box, with @mentions drawn as highlighted chips. */}
            <div className="hl" ref={hl} aria-hidden>{marked(text)}{"\u200b"}</div>
            <textarea ref={inp} id="inp" rows={1} value={text} onInput={onInput} onChange={() => {}} onKeyDown={onKey}
              onScroll={(e) => hl.current && (hl.current.scrollTop = e.currentTarget.scrollTop)}
              placeholder={busy ? `${busy}…` : PLACEHOLDER[scene] ?? "Say what to do…"} aria-label="Talk or type to Rehearse" autoFocus />
          </div>
          <button className={`send ${counting ? "count" : ""}`} onClick={() => handle(text)} aria-label="Send">
            <I d={IC.up} w={2.4} />
            <svg className="cring" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /></svg>
          </button>
        </div>
        <div className="tries">
          <span className="lbl">Try</span>
          <span style={{ display: "flex", gap: 2 }}>
            {hints.map((h, k) => <button key={h} className={`hint ${k === 0 ? "nx" : ""}`} onClick={() => handle(h)}>“{h}”</button>)}
          </span>
        </div>
      </div>
    </>
  );
}

// Pick the voice by ear: the browser's voices for one language, best-sounding first. Picking one plays a sample.
const SAMPLE_LINE: Record<SpeakLang, string> = {
  "en-IN": "Hi! This is how I will sound on your calls.",
  "hi-IN": "नमस्ते! आपकी कॉल पर मेरी आवाज़ ऐसी होगी।",
  "te-IN": "నమస్కారం! మీ కాల్స్‌లో నా గొంతు ఇలా ఉంటుంది.",
};
function VoicePick({ lang }: { lang: SpeakLang }) {
  const [v, setV] = useState<{ list: string[]; picked: string }>({ list: [], picked: "" });
  const [loading, setLoading] = useState("");
  useEffect(() => {
    voicesFor(lang).then(setV);
  }, [lang]);
  if (!v.list.length) return null;
  const now = v.picked || v.list[0];
  return (
    <label>
      <span>{lang === "te-IN" ? "Telugu" : lang === "hi-IN" ? "Hindi" : "English"} voice</span>
      <select value={now} onChange={async (e) => {
        const name = e.target.value;
        pickVoiceName(lang, name);
        setV({ ...v, picked: name });
        // A natural Telugu voice downloads once (63 MB): say so, then play the sample in that voice.
        setLoading(/\(natural/.test(name) ? "Downloading this voice once (63 MB)…" : "");
        await loadVoiceByName(name).catch(() => setLoading("Could not download this voice. The system voice is used."));
        setLoading((l) => (l.startsWith("Could not") ? l : ""));
        speak(SAMPLE_LINE[lang], lang).catch(() => {});
      }}>
        {v.list.map((n) => <option key={n}>{n}</option>)}
      </select>
      {loading && <small className="vload">{loading}</small>}
    </label>
  );
}

// A number that counts up when it appears, so a stat reads as a result, not a label. Writes the DOM directly (no re-renders).
function Num({ v, d = 0, ms = 1100, wait = 0 }: { v: number; d?: number; ms?: number; wait?: number }) {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const out = el.current;
    if (!out) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return void (out.textContent = v.toFixed(d));
    const t0 = performance.now() + wait;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - t0) / ms));
      out.textContent = (v * (1 - (1 - k) ** 3)).toFixed(d);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v, d, ms, wait]);
  return <span ref={el}>{(0).toFixed(d)}</span>;
}

// Why this exists: the same job on one timeline, my old way (from my own work logs, see docs/results.md)
// against this browser's measured Rehearse time. The old bar fills slowly; the Rehearse bar barely starts.
const BREAKS = ["Booked a demo without a clear yes", "Wrong add-on price in 6 of 9 calls", "Hung up when the caller said “hmm”", "Telugu replies mixed in other scripts"];
function Proof() {
  const fixed = listDrafts()
    .filter((d) => d.id !== SAMPLE_ID && d.times?.start && d.times.fixed)
    .map((d) => ({ name: d.bot?.name ?? "", min: (d.times!.fixed! - d.times!.start!) / 60000 }))
    .sort((a, b) => a.min - b.min)[0];
  return (
    <div className="race">
      <div className="lane old">
        <div className="lh"><small>My old way · one real sales bot (EN/HI/TE)</small><b>~<Num v={3} ms={2400} wait={300} /> weeks</b></div>
        <div className="track">
          <i className="fill" />
          <div className="pticks" aria-hidden>{Array.from({ length: 87 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
        </div>
        <div className="axis"><span>2 Oct · first version live</span><span><Num v={87} ms={2400} wait={300} /> prompt saves</span><span>24 Oct · stopped breaking rules</span></div>
        <p className="found">Found only after real calls:</p>
        <ul className="pins">{BREAKS.map((t, i) => <li key={t} style={{ ["--i" as string]: i }}>{t}</li>)}</ul>
      </div>
      <div className="lane new">
        <div className="lh"><small>With Rehearse · measured in this browser</small><b>{fixed ? <><Num v={Math.max(1, Math.round(fixed.min))} ms={500} wait={2900} /> min</> : "minutes"}</b></div>
        <div className="track"><i className="fill" /></div>
        <ol className="steps4">
          {["Describe it by voice", "Rehearse a call", "Rule break turns red", "Say the fix, replay"].map((t, i) => <li key={t} style={{ ["--i" as string]: i }}>{t}</li>)}
        </ol>
        <p className="found">{fixed ? `${fixed.name}: from the brief to a caught and fixed rule break, before any real caller.` : "Build a bot, rehearse it and fix the first broken rule: your measured time replaces “minutes”."}</p>
      </div>
      <div className="pstats">
        {([[7, "voice agents built at work"], [22, "live bots, 3 languages"], [61, "hours of my hands-on time"], [58, "calls reviewed by hand"]] as const).map(([n, t], i) => (
          <p key={t} style={{ ["--i" as string]: i }}><b><Num v={n} /></b><span>{t}</span></p>
        ))}
      </div>
    </div>
  );
}

function BotList({ on, open, current, add }: { on: boolean; open: (d: Draft) => void; current?: string; add: () => void }) {
  const [, redraw] = useState(0);
  const [sure, setSure] = useState("");
  const list = on ? listDrafts() : [];
  if (!list.length) return <p className="empty">No bots yet. Say what you want to build.</p>;
  return (
    <div className="bots">
      {list.map((d, i) => (
        <div key={d.id} className="tile" style={{ ["--d" as string]: `${i * 0.05}s` }}>
          <button className="tilebody" onClick={() => open(d)}>
            <small>{d.id === SAMPLE_ID ? "Sample · " : ""}{d.bot ? `v${d.bot.version}` : "Draft · questions to answer"}{d.id === current ? " · open now" : ""}</small>
            <b>{d.bot?.name ?? d.interview?.name ?? "Untitled"}</b>
            <span>{(d.bot?.languages ?? d.interview?.understood.languages ?? []).map(langName).join(" · ")}</span>
            {d.times?.start && (d.times.fixed ?? d.times.rehearsed) && (
              <span className="took">Idea → {d.times.fixed ? "fixed and tested" : "first test call"} in {Math.max(1, Math.round(((d.times.fixed ?? d.times.rehearsed)! - d.times.start) / 60000))} min</span>
            )}
          </button>
          {d.id !== SAMPLE_ID && d.id !== current && (
            // Two clicks to remove, so a stray click never loses a bot.
            <button className={`rm ${sure === d.id ? "sure" : ""}`} onClick={() => (sure === d.id ? (removeDraft(d.id), setSure(""), redraw((n) => n + 1)) : setSure(d.id))}
              onBlur={() => setSure("")} aria-label={`Remove ${d.bot?.name ?? "bot"}`}>
              {sure === d.id ? "Remove for good?" : "Remove"}
            </button>
          )}
        </div>
      ))}
      <div className="tile new" style={{ ["--d" as string]: `${list.length * 0.05}s` }}>
        <button className="tilebody" onClick={add}><b>+ New bot</b><span>or say “start a new bot”</span></button>
      </div>
    </div>
  );
}

// The right-hand panel: what this screen means at a glance, so the centre can stay focused.
// It floats over the right gutter (like the running order on the left) and never moves the centre.
type SideProps = {
  scene: Scene; bot: Bot | null; sel: { kind: string; id?: string } | null; lines: Line[]; vlines: Line[];
  timing: Timing | null; undo: Bot[]; draft: Draft | null;
};
// After a rehearsal: where the call went, what broke, what got fixed, and where to push next.
function CallReport({ bot, lines, again, fix }: { bot: Bot; lines: Line[]; again: () => void; fix: () => void }) {
  const seen = new Set(lines.flatMap((l) => (l.role === "bot" && l.step_id ? [l.step_id] : [])));
  const broke = [...new Set(lines.flatMap((l) => l.broken?.map((b) => b.rule_id) ?? []))];
  const no = (id: string) => bot.rules.findIndex((r) => r.id === id) + 1;
  const fixed = lines.filter((l) => l.fixed).length;
  const left = bot.flow.steps.filter((s) => !seen.has(s.id));
  const replies = lines.filter((l) => l.role === "bot").length;
  const badLine = [...lines].reverse().find((l) => l.broken?.length && !l.fixed)?.text;
  return (
    <div className="report">
      <div className="rhead"><h4>Call report</h4><button className="btn ghost" onClick={again}>Rehearse again</button></div>
      <div className="rstats">
        <p><b><Num v={seen.size} />/{bot.flow.steps.length}</b><span>steps reached</span></p>
        <p className={broke.length ? "bad" : ""}><b><Num v={broke.length} /></b><span>{broke.length === 1 ? "rule broken" : "rules broken"}</span></p>
        <p><b><Num v={fixed} /></b><span>{fixed === 1 ? "fix replayed" : "fixes replayed"}</span></p>
        <p><b><Num v={replies} /></b><span>bot lines checked</span></p>
      </div>
      {broke.length > 0 && <p>Broke {broke.map((id) => `rule ${no(id)} (${bot.rules.find((r) => r.id === id)?.text})`).join(", ")}.</p>}
      {badLine && <blockquote className="rquote">“{badLine}”</blockquote>}
      {badLine && <button className="btn" onClick={fix}>Fix this line</button>}
      {left.length > 0 && <p className="next">Not reached yet: {left.slice(0, 3).map((s) => s.label).join(", ")}{left.length > 3 ? ` and ${left.length - 3} more` : ""}. Try a caller who goes that way.</p>}
    </div>
  );
}

function SidePanel({ scene, bot, sel, lines, vlines, timing, undo, draft }: SideProps) {
  const body = (() => {
    const u = draft?.interview?.understood;
    if (scene === "questions" && u)
      return (
        <>
          <h4>Understood so far</h4>
          {u.goal && <p>{u.goal}</p>}
          <ul className="ticks">
            {u.languages.map((l) => <li key={l}>{langName(l)}</li>)}
            {u.never.map((r) => <li key={r} className="bad">Never: {r}</li>)}
            {u.always.map((r) => <li key={r}>Always: {r}</li>)}
          </ul>
          <p className="hint2">Answer every question in one breath. Anything you skip, the bot will ask you later.</p>
        </>
      );
    if (!bot) return null;
    const step = sel?.kind === "step" ? bot.flow.steps.find((x) => x.id === sel.id) : undefined;
    const no = (id: string) => bot.flow.steps.findIndex((x) => x.id === id) + 1;
    if (scene === "blueprint" && step)
      return (
        <>
          <h4>Step {no(step.id)} · {step.label}</h4>
          <blockquote>“{step.says}”</blockquote>
          <ul className="links">
            {bot.flow.links.filter((l) => l.from === step.id).map((l) => (
              <li key={l.to}><span>{l.when === "always" ? "then" : `if ${l.when}`}</span> → {no(l.to)} {bot.flow.steps.find((x) => x.id === l.to)?.label}</li>
            ))}
          </ul>
          <p className="hint2">Now say the change, e.g. “make this shorter”.</p>
        </>
      );
    if (scene === "blueprint")
      return (
        <>
          <h4>Reading the flow</h4>
          <ul className="legend2">
            <li><i className="lg-box" />A step: what the bot says</li>
            <li><i className="lg-end" />An end of the call</li>
            <li><i className="lg-chg" />Just changed by you</li>
          </ul>
          <p className="stat"><b>{bot.flow.steps.length}</b> steps · <b>{bot.flow.links.filter((l) => l.when !== "always").length}</b> choices</p>
          <p className="hint2">Click a step to see its line here. Double-click to pick several.</p>
        </>
      );
    if (scene === "rules") {
      const n = (k: string) => bot.rules.filter((r) => r.kind === k).length;
      return (
        <>
          <h4>Rules at a glance</h4>
          <p className="stat"><b>{n("never")}</b> never · <b>{n("always")}</b> always</p>
          <p>{bot.rules.filter((r) => r.suggested).length} suggested by Rehearse: say “keep” or “drop”.</p>
          <p className="hint2">Every reply in a rehearsal is checked against these.</p>
        </>
      );
    }
    if (scene === "knowledge")
      return (
        <>
          <h4>Why facts</h4>
          <p>The bot may only state what is here. It never invents prices, dates or features.</p>
          <p className="hint2">Say “add: the trial is 14 days”.</p>
        </>
      );
    if (scene === "prompt")
      return (
        <>
          <h4>Built from</h4>
          <ul className="ticks">
            <li>{bot.flow.steps.length} steps</li><li>{bot.rules.length} rules</li><li>{bot.knowledge.length} facts</li>
          </ul>
          <p className="stat"><b>{bot.prompt.split(/\s+/).length}</b> words</p>
          <p className="hint2">You never edit this by hand. Change the flow, rules or facts and it rewrites itself.</p>
        </>
      );
    if (scene === "call" || scene === "fix") {
      const broken = new Set(lines.flatMap((l) => l.broken?.map((b) => b.rule_id) ?? []));
      const replies = lines.filter((l) => l.role === "bot").length;
      return (
        <>
          <h4>Rules on this call</h4>
          <ul className="rulecheck">
            {bot.rules.map((r, i) => (
              <li key={r.id} className={broken.has(r.id) ? "bad" : replies > 1 ? "ok" : ""}>
                <i>{broken.has(r.id) ? "✗" : replies > 1 ? "✓" : "·"}</i>{i + 1}. {r.text}
              </li>
            ))}
          </ul>
          <p className="hint2">{replies} bot {replies === 1 ? "line" : "lines"} checked. Try a tricky caller to test the rest.</p>
          {undo.length > 0 && <p className="stat">Version <b>v{bot.version}</b> · say “undo” to go back</p>}
        </>
      );
    }
    if (scene === "voice")
      return timing ? (
        <>
          <h4>Last reply speed</h4>
          <p className="bignum">{(timing.total / 1000).toFixed(2)}<small> s</small></p>
          <p className="hint2">From the end of your sentence to the bot’s first sound.</p>
          <ul className="split">
            <li><i style={{ background: "var(--s2)" }} />Hearing<span>{(timing.hear / 1000).toFixed(2)} s</span></li>
            <li><i style={{ background: "var(--s3)" }} />Thinking<span>{(timing.think / 1000).toFixed(2)} s</span></li>
            <li><i style={{ background: "var(--s4)" }} />First sound<span>{(timing.speak / 1000).toFixed(2)} s</span></li>
          </ul>
          <p className="hint2">Hearing includes the short pause that tells it you finished. Your turns so far: {vlines.filter((l) => l.role === "caller").length}.</p>
        </>
      ) : (
        <>
          <h4>What this measures</h4>
          <p>Talk to the bot like a real caller. After each reply you see how fast it answered.</p>
          <p className="hint2">Under about 1.5 s feels natural on a phone.</p>
        </>
      );
    if (scene === "export")
      return (
        <>
          <h4>In every export</h4>
          <ul className="ticks">
            <li>{bot.flow.steps.length} steps as instructions</li><li>{bot.rules.length} rules</li><li>{bot.knowledge.length} facts</li><li>The first line</li>
          </ul>
          <p className="hint2">Not included: phone numbers and voices. You choose those on the platform.</p>
        </>
      );
    return null;
  })();
  return body ? <aside className="side" key={scene}>{body}</aside> : null;
}
