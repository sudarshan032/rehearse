"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { langName, TOOL_SHELF, type Bot, type Interview } from "@/lib/bot";
import { guessIntent, personaOf, type Stage as SayStage, type Tab } from "@/lib/say";
import { getDraft, listDrafts, newId, post, saveDraft, type Draft } from "@/lib/store";
import { EXPORTS } from "@/lib/export";
import { SAMPLE_BOT, SAMPLE_BRIEF, SAMPLE_CALL, SAMPLE_ID } from "@/lib/sample";
import { Flow } from "./Flow";

type Scene = "describe" | "questions" | "building" | "blueprint" | "rules" | "knowledge" | "prompt" | "stack" | "call" | "fix" | "voice" | "export" | "bots";
type Broken = { rule_id: string; quote: string; why: string };
type Line = { role: "caller" | "bot"; text: string; step_id?: string; broken?: Broken[]; ended?: boolean; fixed?: boolean };
type Target = { kind: "step" | "rule" | "knowledge" | "prompt" | "turn"; id?: string; text?: string; label: string };
type EditResult = { bot: Bot; summary: string; changed: { steps: string[]; rules: string[]; knowledge: string[] }; applied: number };
type Timing = { hear: number; think: number; speak: number; total: number; left?: string };

const PROGRESS: [string, Scene][] = [["Describe", "describe"], ["Questions", "questions"], ["Blueprint", "blueprint"], ["Rehearse", "call"], ["Fix", "fix"], ["Voice test", "voice"], ["Export", "export"]];
const SAY_STAGE: Record<Scene, SayStage> = {
  describe: "describe", questions: "interview", building: "interview", blueprint: "blueprint", rules: "blueprint", knowledge: "blueprint",
  prompt: "blueprint", stack: "blueprint", call: "rehearse", fix: "rehearse", voice: "blueprint", export: "blueprint", bots: "describe",
};
const TAB_SCENE: Partial<Record<Tab, Scene>> = { flow: "blueprint", rules: "rules", knowledge: "knowledge", prompt: "prompt", stack: "stack", rehearse: "call", voice: "voice", export: "export", bots: "bots", home: "describe" };
const HINTS: Record<Scene, string[]> = {
  describe: ["show me the sample", "A sales bot that calls my free users", "నా saree shop కోసం ఒక support bot"],
  questions: ["answer them all in one go", "just build it", "ask me more"],
  building: [],
  blueprint: ["rehearse as an angry customer", "show the rules", "after the greeting, ask if they are a student"],
  rules: ["drop rule 3", "never share prices on WhatsApp", "back to the flow"],
  knowledge: ["add: the trial is 14 days", "show the prompt", "back to the flow"],
  prompt: ["make it more polite", "show the stack", "back to the flow"],
  stack: ["voice test", "export", "back to the flow"],
  call: ["It's too expensive for me", "Can I get a refund if I don't like it?", "stop the call"],
  fix: ["replay", "rehearse again", "back to the flow"],
  voice: ["back to the flow", "export", "rehearse"],
  export: ["download", "start a new bot", "show my bots"],
  bots: ["start a new bot", "open the first one"],
};
const PLACEHOLDER: Partial<Record<Scene, string>> = {
  describe: "Hold fn and describe your bot…",
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
  { s: "fix", name: "Fix", re: /\bfix(es)?\b/ },
  { s: "voice", name: "Voice test", re: /\bvoice( test)?\b/ },
  { s: "export", name: "Export", re: /\b(export|download)\b/ },
  { s: "bots", name: "My bots", re: /\b(my bots|all bots|bots)\b/ },
];
const GO = /^(please |ok(ay)? |now |and )?(go|move|take me|jump|switch|show|open|see|view|display|let'?s go|let me see|bring( up)?|back)\b/;
const NEXT = /^(please |ok(ay)? |now |just )?((move|go) )?(forward|next|onward|ahead|on)( step| page| one)?$|^(continue|next step|move on|go ahead|proceed)$/;
const PREV = /^(please |ok(ay)? |now |just )?((move|go|step) )?(back(ward)?|previous|before)( step| page| one)?$|^(wapas|venakki)$/;

// The intro sentence: [word, cut?]. Filler and the self-correction get cut, like Wispr does.
const INTRO: [string, boolean][] = [
  ["So", true], ["um,", true], ["I", false], ["want", false], ["a", false], ["bot", false], ["that", false], ["uh", true],
  ["calls", false], ["my", true], ["users,", true], ["actually", true], ["no,", true], ["my", false], ["free", false], ["users", false],
  ["in", false], ["Telugu,", false], ["and", false], ["never", false], ["promises", false], ["refunds.", false],
];

const langOf = (s: string) => (/[ఀ-౿]/.test(s) ? "TE" : /[ऀ-ॿ]/.test(s) ? "HI" : "EN");
const ttsLang = (s: string, bot: Bot) => (/[ఀ-౿]/.test(s) ? "te-IN" : /[ऀ-ॿ]/.test(s) ? "hi-IN" : bot.languages.includes("en") ? "en-IN" : bot.persona.voice.lang);
const undoRe = /^(undo|undo that|undo it|revert|wapas karo)\b/i;
const replayRe = /^(replay|replay (it|that|the turn)|try (it )?again|again)\b/i;
const backRe = /^(back|go back|previous|wapas|venakki)\.?$/i;
const stopRe = /\b(stop|end|hang up|cut) (the )?call\b/i;
const moreRe = /\bask (me )?more\b/i;
const downloadRe = /^(please )?(download|save it|export it)\b/i;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

const I = ({ d, w = 2 }: { d: string; w?: number }) => (
  <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);
const IC = {
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  wave: '<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3l7 3v5c0 4.4-2.9 8-7 10-4.1-2-7-5.6-7-10V6z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
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
  const [changed, setChanged] = useState<EditResult["changed"] & { summary: string } | null>(null);
  const [undo, setUndo] = useState<Bot[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [persona, setPersona] = useState("");
  const [fix, setFix] = useState<{ step?: string; rule?: string; before: string; summary: string } | null>(null);
  const [vig, setVig] = useState("");
  const [counting, setCounting] = useState(false);
  const [timing, setTiming] = useState<Timing | null>(null);
  const [rec, setRec] = useState(false);
  const [theme, setTheme] = useState("light");
  const inp = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const media = useRef<MediaRecorder | null>(null);
  const queued = useRef(false);
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
        ...bot.flow.steps.map((x, i) => ({ token: `@${x.label}`, kind: "step" as const, id: x.id, label: `step ${i + 1}` })),
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

  // Restore the bot that was open before a reload.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? "light");
    try {
      const open = sessionStorage.getItem("rehearse:open");
      const d = open ? getDraft(open) : undefined;
      if (d) {
        setDraft(d);
        setScene(d.bot ? "blueprint" : d.interview ? "questions" : "describe");
      }
    } catch {}
  }, []);

  // Keep the one input focused so Wispr Flow always types into it.
  useEffect(() => {
    const refocus = () =>
      setTimeout(() => {
        const a = document.activeElement;
        if (a !== inp.current && !(a instanceof HTMLInputElement) && !String(getSelection())) inp.current?.focus({ preventScroll: true });
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
      if (e.key.length === 1 && !(document.activeElement instanceof HTMLInputElement)) inp.current?.focus({ preventScroll: true });
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

  // After every screen change or finished step, the box gets the focus back.
  useEffect(() => {
    if (document.activeElement !== inp.current && !(document.activeElement instanceof HTMLInputElement)) inp.current?.focus({ preventScroll: true });
    log("scene", { scene, busy });
  }, [scene, busy]);

  const store = useCallback((d: Draft) => {
    setDraft(d);
    saveDraft(d);
    try {
      sessionStorage.setItem("rehearse:open", d.id);
    } catch {}
  }, []);

  function go(s: Scene, remember = true) {
    if (s === scene) return;
    if (remember) setPast((p) => [...p.slice(-20), scene]);
    setScene(s);
    if (s !== "call" && s !== "fix") setVig("");
    if (s === "describe") setBox("");
  }
  function back() {
    const p = past[past.length - 1];
    if (!p) return;
    setPast(past.slice(0, -1));
    setScene(p);
    setVig("");
  }
  const say = (q: string, res: string, extra?: { err?: boolean; ans?: boolean }) => setHeard({ q, res, ...extra });

  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(label);
    try {
      return await fn();
    } catch (e) {
      setHeard((h) => ({ q: h?.q ?? "", res: (e as Error).message, err: true }));
    } finally {
      setBusy("");
    }
  }

  // ---------- the journey ----------
  async function brief(t: string) {
    say(t, "Reading your brief…");
    const r = await run("Reading your brief", () => post<{ interview: Interview }>("/api/interview", { brief: t }));
    if (!r) return;
    store({ id: newId(), brief: t, interview: r.interview, answers: [], updated: 0 });
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
    store({ ...d, bot: r.bot });
    setChanged(null);
    say(t, `Built ${r.bot.flow.steps.length} steps, ${r.bot.rules.length} rules. Say “rehearse” to call it.`);
    setScene("blueprint");
  }

  function applyEdit(t: string, r: EditResult) {
    if (!draft?.bot) return;
    if (!r.applied) return say(t, r.summary, { ans: true });
    setUndo((u) => [...u.slice(-20), draft.bot!]);
    store({ ...draft, bot: r.bot });
    setChanged({ ...r.changed, summary: r.summary });
    say(t, r.summary);
    const wasTurn = sel?.kind === "turn";
    // The named step, rule or fact stays in the box for more changes; "@Last reply" is done.
    const keep = targets.filter((x) => x.kind !== "turn").map((x) => x.token);
    if (keep.length) setTimeout(() => setBox(keep.join(" ") + " "), 0);
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
    store({ ...draft, bot: prev });
    setChanged(null);
    say(t, `Undone. Back to v${prev.version}.`);
  }

  async function startCall(t: string, who?: string) {
    if (!bot) return;
    setPersona(who ?? "");
    setLines([]);
    setVig("");
    setFix(null);
    go("call");
    say(t, who ? `Calling as ${who}. The bot speaks first.` : "Calling. The bot speaks first.");
    const r = await run("Ringing", () => post<{ reply: string; step_id: string; ended: boolean }>("/api/turn", { bot, history: [], text: "" }));
    if (r) setLines([{ role: "bot", text: r.reply, step_id: r.step_id, ended: r.ended }]);
  }

  async function callerTurn(t: string, base: Line[] = lines, b: Bot = bot!) {
    const history = base.map(({ role, text, step_id }) => ({ role, text, step_id }));
    const mine: Line[] = [...base, { role: "caller", text: t }];
    setLines(mine);
    setVig("");
    const r = await run("Bot is thinking", () => post<{ reply: string; step_id: string; ended: boolean }>("/api/turn", { bot: b, history, text: t }));
    if (!r) return null;
    const line: Line = { role: "bot", text: r.reply, step_id: r.step_id, ended: r.ended };
    setLines([...mine, line]);
    const c = await run("Checking the rules", () =>
      post<{ broken: Broken[] }>("/api/check", { rules: b.rules.map(({ id, kind, text }) => ({ id, kind, text })), reply: r.reply, caller: t, knowledge: b.knowledge.map(({ text }) => ({ text })) }),
    );
    const broken = c?.broken ?? [];
    const done = { ...line, broken };
    setLines([...mine, done]);
    if (broken.length) {
      const ri = b.rules.findIndex((x) => x.id === broken[0].rule_id);
      const step = b.flow.steps.findIndex((s) => s.id === r.step_id);
      setVig("bad");
      lastTurn.current = `Caller: ${t}\nBot: ${r.reply}`;
      setTimeout(() => setBox("@Last reply "), 0);
      void step;
      say(t, `Broke rule ${ri + 1}. Say the fix.`);
    } else say(t, r.ended ? "Call ended" : "Bot replied · rules kept");
    return done;
  }

  async function replay(t: string) {
    if (!bot) return;
    const i = lines.map((l) => l.role).lastIndexOf("caller");
    if (i < 0) return startCall(t, persona);
    go("call");
    const res = await callerTurn(lines[i].text, lines.slice(0, i), bot);
    if (res && !res.broken?.length) {
      setLines((ls) => ls.map((l, k) => (k === ls.length - 1 ? { ...l, fixed: true } : l)));
      setVig("good");
      say(t, "Replayed with the fix · rule kept");
    }
  }

  // ---------- voice test (real mic → Deepgram → Groq → Murf) ----------
  async function micStart() {
    if (rec || busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        voiceTurn(new Blob(chunks, { type: mr.mimeType }));
      };
      mr.start();
      media.current = mr;
      setRec(true);
    } catch {
      say("", "Allow the microphone to run a voice test", { err: true });
    }
  }
  function micStop() {
    if (!media.current) return;
    media.current.stop();
    media.current = null;
    setRec(false);
  }
  async function voiceTurn(audio: Blob) {
    if (!bot) return;
    const t0 = performance.now();
    const heardRes = await run("Hearing", async () => {
      const res = await fetch(`/api/stt?langs=${bot.languages.join(",")}`, { method: "POST", headers: { "Content-Type": audio.type || "audio/webm" }, body: audio });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not hear that");
      return j as { text: string; ms: number };
    });
    if (!heardRes?.text) return say("", "I heard nothing. Hold the button while you talk.", { err: true });
    const t1 = performance.now();
    const history = lines.map(({ role, text, step_id }) => ({ role, text, step_id }));
    const r = await run("Thinking", () => post<{ reply: string; step_id: string; ended: boolean }>("/api/turn", { bot, history, text: heardRes.text }));
    if (!r) return;
    const t2 = performance.now();
    setLines([...lines, { role: "caller", text: heardRes.text }, { role: "bot", text: r.reply, step_id: r.step_id, ended: r.ended }]);
    say(heardRes.text, "Speaking…");
    const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: r.reply.slice(0, 300), lang: ttsLang(r.reply, bot) }) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setTiming({ hear: t1 - t0, think: t2 - t1, speak: 0, total: t2 - t0 });
      return say(heardRes.text, j.error ?? "Voice is off. Text reply shown.", { err: true });
    }
    const blob = await res.blob();
    const t3 = performance.now();
    const ttfb = Number(res.headers.get("x-ttfb-ms")) || t3 - t2;
    setTiming({ hear: t1 - t0, think: t2 - t1, speak: ttfb, total: t1 - t0 + (t2 - t1) + ttfb, left: res.headers.get("x-tts-left") ?? undefined });
    new Audio(URL.createObjectURL(blob)).play().catch(() => {});
    say(heardRes.text, "Bot replied out loud");
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
      queued.current = true; // said while busy: run it as soon as the current step ends
      return;
    }
    setText("");
    log("said", { scene, text: t, targets: targets.map((x) => x.token) });
    const stage = SAY_STAGE[scene];
    const pointing = !!sel;
    const low = t.toLowerCase().replace(/[.!?,]+$/g, "").trim();
    const words = low.split(/\s+/).length;

    if (/^(clear|deselect|unselect|cancel)( (it|that|this|the selection|selection))?$/.test(mentionsIn(low).rest || low)) return setBox(""), say(t, "Cleared");
    if (/^(hide|close|collapse) (the )?(panel|path|sidebar|side panel)$/.test(low)) return setPanel(false), say(t, "Panel hidden. Say “show the panel” to bring it back.");
    if (/^(show|open) (the )?(panel|path|sidebar|side panel)$/.test(low)) return setPanel(true), say(t, "Panel shown");
    if (/\b(play|show)\b.*\b(sample|saved) call\b|^play (the )?(call|rehearsal)$/.test(low)) return bot ? playSample(t) : openSample(t);
    if (/\b(sample|example|demo)( bot)?$/.test(low) && words <= 5 && scene !== "call") return openSample(t);
    if (NEXT.test(low)) return step(t, 1);
    if (PREV.test(low)) return back(), say(t, "Back");
    if (words <= 7 && (GO.test(low) || words <= 2)) {
      const place = JOURNEY.find((j) => j.re.test(low));
      if (place && !(scene === "call" && place.s === "call")) return goTo(t, place.s);
    }

    if (backRe.test(t)) return back(), say(t, "Back");
    if (undoRe.test(t) && bot) return doUndo(t);
    if (/^(dark|light)( mode)?$/i.test(t)) return toggleTheme(t.toLowerCase().startsWith("dark") ? "dark" : "light");
    if (scene === "fix" && replayRe.test(t)) return replay(t);
    if ((scene === "call" || scene === "fix") && stopRe.test(t)) return go("blueprint"), say(t, "Call stopped");
    if (downloadRe.test(t) && bot) {
      const x = EXPORTS.find((e) => low.includes(e.name.toLowerCase()) || low.includes(e.id)) ?? EXPORTS[0];
      return exportAs(x.id), say(t, `Downloaded ${x.name}`);
    }
    if (scene === "bots") {
      const list = listDrafts();
      const m = /first/i.test(t) ? list[0] : list.find((d) => (d.bot?.name ?? d.interview?.name ?? "").toLowerCase().split(/\s+/).some((w) => w.length > 3 && t.toLowerCase().includes(w)));
      if (m) return open(m), say(t, `Opened ${m.bot?.name ?? m.interview?.name}`);
    }

    const g = guessIntent(stage, t, pointing);
    if (g?.intent === "navigate" && g.tab) return nav(t, g.tab);
    if (scene === "questions" && moreRe.test(t)) return askMore(t);

    if (scene === "describe" || scene === "bots") return brief(t);
    if (scene === "questions" && (/^(rehears|call it|test it|try it|show|open|go to|take me)/.test(low) || (words < 3 && g?.intent !== "build_now")))
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
      post<{ intent: string; tab?: Tab; answer?: string; persona?: string } & Partial<EditResult>>("/api/say", {
        stage, bot, selection: sel ? { kind: sel.kind, id: sel.id, text: sel.text } : undefined,
        text: targets.length > 1 ? `(This is about: ${targets.map((x) => `${x.token.slice(1)} = ${x.label}`).join("; ")}) ${t}` : t,
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
    if (s !== "questions" && !bot) return say(t, "Build the bot first", { err: true });
    if (s === "fix" && !fix) return say(t, "Nothing fixed yet. Rehearse first.", { err: true });
    if (s === "call") return lines.length ? (go("call"), say(t, "Back to the call")) : startCall(t);
    go(s);
    say(t, `Showing ${JOURNEY.find((j) => j.s === s)?.name}`);
  }
  function step(t: string, dir: 1 | -1) {
    const order: Scene[] = ["describe", "questions", "blueprint", "call", "voice", "export"];
    const here = order.indexOf(scene === "building" ? "questions" : ["rules", "knowledge", "prompt", "stack"].includes(scene) ? "blueprint" : scene === "fix" ? "call" : scene);
    const to = order[Math.min(order.length - 1, Math.max(0, here + dir))];
    if (to === scene) return say(t, "This is the last step");
    if (scene === "questions" && dir === 1) return build(t, "");
    goTo(t, to);
  }

  function nav(t: string, tab: Tab) {
    if (tab === "back") return back(), say(t, "Back");
    if (tab === "sample") return openSample(t);
    if (tab === "home") {
      setDraft(null);
      setLines([]);
      try {
        sessionStorage.removeItem("rehearse:open");
      } catch {}
      go("describe");
      return say(t, "New bot");
    }
    const s = TAB_SCENE[tab];
    if (!s) return;
    if (s !== "bots" && !bot) return say(t, "Build the bot first", { err: true });
    if (s === "call") return startCall(t);
    go(s);
    say(t, `Showing ${tab === "flow" ? "the flow" : tab}`);
  }

  function openSample(t: string) {
    open(getDraft(SAMPLE_ID) ?? { id: SAMPLE_ID, brief: SAMPLE_BRIEF, answers: [], bot: SAMPLE_BOT, updated: 0 });
    say(t, "The sample bot. Say “play the sample call” to watch a rehearsal break a rule.");
  }

  // The saved rehearsal: plays line by line, no AI needed, ends on a broken rule.
  function playSample(t: string) {
    if (!bot) return;
    setPersona("Telugu caller, asks about refunds");
    setLines([]);
    setFix(null);
    setVig("");
    go("call");
    say(t, "Playing the saved sample call");
    SAMPLE_CALL.forEach((l, i) =>
      setTimeout(() => {
        setLines(SAMPLE_CALL.slice(0, i + 1));
        if (l.broken) {
          setVig("bad");
          lastTurn.current = `Caller: ${SAMPLE_CALL[i - 1].text}\nBot: ${l.text}`;
          setBox("@Last reply ");
          say(t, "Broke rule 1. Say the fix, e.g. “if they ask for a refund, say the trial is free and offer a manager callback”.");
        }
      }, 700 + i * 1100),
    );
  }

  function open(d: Draft) {
    store(d);
    setUndo([]);
    setLines([]);
    setChanged(null);
    go(d.bot ? "blueprint" : "questions");
  }

  function exportAs(id: string) {
    const x = EXPORTS.find((e) => e.id === id);
    if (bot && x) download(...(x.file(bot) as [string, string, string]));
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
    if (ie.inputType === "insertFromPaste" || ie.inputType === "insertReplacementText" || jump > 1) {
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
    }

  }

  function pickStep(id: string, add = false, dbl = false) {
    if (!bot) return;
    const i = bot.flow.steps.findIndex((s) => s.id === id);
    attach(`@${bot.flow.steps[i].label}`, add, dbl);
  }

  // ---------- render ----------
  const stepNo = (id?: string) => (bot && id ? bot.flow.steps.findIndex((s) => s.id === id) + 1 : 0);
  const path = lines.filter((l) => l.role === "bot" && l.step_id).map((l) => l.step_id!);
  const lastBot = [...lines].reverse().find((l) => l.role === "bot");
  const badStep = lastBot?.broken?.length ? lastBot.step_id : undefined;
  const progIdx = PROGRESS.findIndex(([, s]) => s === (scene === "building" ? "questions" : ["rules", "knowledge", "prompt", "stack"].includes(scene) ? "blueprint" : scene));
  const reach = (s: Scene) => s === "describe" || (s === "questions" ? !!draft?.interview : !!bot && (s !== "fix" || !!fix));
  const u = draft?.interview?.understood;
  const hints = scene === "call" && sel ? ["if they ask for a refund, offer a manager callback instead", "replay", "stop the call"] : HINTS[scene];

  return (
    <>
      <header className="top">
        <div className="brand" onClick={() => nav("", "home")}>
          <span className="logo"><I d={IC.wave} w={2.4} /></span>
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
          <button className="pillbtn" onClick={() => go("bots")}><I d={IC.bots} />My bots</button>
          <button className="iconbtn" onClick={() => toggleTheme()} aria-label="Switch light or dark"><I d={theme === "dark" ? IC.sun : IC.moon} /></button>
        </div>
      </header>

      <nav className={`journey ${panel ? "" : "closed"}`} aria-label="Where you are">
        <div className="jt">Your path<button onClick={() => setPanel(!panel)} aria-label={panel ? "Hide the path" : "Show the path"}>{panel ? "‹" : "›"}</button></div>
        {JOURNEY.map((j) => {
          const here = scene === j.s || (scene === "building" && j.s === "questions");
          const ok = j.s === "describe" || j.s === "bots" || (j.s === "questions" ? !!draft?.interview : !!bot && (j.s !== "fix" || !!fix));
          return (
            <button key={j.s} className={`${j.sub ? "sub" : ""} ${here ? "here" : ""}`} disabled={!ok} onClick={() => goTo("", j.s)}>
              <i />{j.name}
              {bot && j.s === "rules" && <small>{bot.rules.length}</small>}
              {bot && j.s === "knowledge" && <small>{bot.knowledge.length}</small>}
              {bot && j.s === "blueprint" && <small>{bot.flow.steps.length} steps</small>}
            </button>
          );
        })}
        <div className="jh">Say “go to rules”, “next” or “back”.{past.length > 0 && <> Came from: <b>{JOURNEY.find((j) => j.s === past[past.length - 1])?.name ?? "Questions"}</b></>}</div>
      </nav>

      <main className={panel ? "withpanel" : ""}>
        <section className={`scene ${scene === "describe" ? "on" : ""}`}>
          <div className="eyebrow">Rehearse · build a voice bot by talking</div>
          {/* 2.5 s intro: messy speech, the filler gets cut, a clean bot comes out. */}
          <div className="intro" aria-hidden>
            <p className="said">
              {INTRO.map(([w, cut], i) => (
                <span key={i} className={cut ? "f" : "k"} style={{ ["--i" as string]: i }}>{w} </span>
              ))}
            </p>
            <div className="built">
              <span>1 Greet</span><i>→</i><span>2 Ask about the limit</span><i>→</i><span>3 Offer the Pro trial</span>
              <b>Never promise a refund</b>
            </div>
          </div>
          <h1 className="h1s">What voice bot do you want to build?</h1>
          <p className="sub0">Hold <kbd>fn</kbd> and talk, in English, हिंदी, తెలుగు or a mix. I’ll ask a few questions, then build it.</p>
          <button className="samplebtn" onClick={() => openSample("show me the sample")}>See a finished sample →</button>
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
            </>
          )}
        </section>

        <section className={`scene ${scene === "building" ? "on" : ""}`}>
          <h2>Drawing the call flow</h2>
          <div className="dots"><i /><i /><i /></div>
          <p className="sub0">Steps, rules, facts and the prompt, from what you said.</p>
        </section>

        <section className={`scene ${scene === "blueprint" ? "on" : ""}`}>
          {bot && (
            <>
              <div className="eyebrow">{bot.name} · v{bot.version} · {bot.languages.map(langName).join(" · ")} · click a step, then say the change</div>
              <div className="flowbig" key={`${bot.id}-${scene}`}>
                <Flow bot={bot} chg={changed?.steps} sel={targets.filter((x) => x.kind === "step").map((x) => x.id!)} onPick={pickStep} />
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
                  <ol>{bot.knowledge.map((k, i) => <li key={k.id} className={changed?.knowledge.includes(k.id) ? "chg" : ""} onClick={(e) => attach(`@Fact ${i + 1}`, e.shiftKey || e.metaKey)} onDoubleClick={() => attach(`@Fact ${i + 1}`, true, true)}>{k.text}</li>)}</ol>
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
                  <div><small>Hears</small><b>Deepgram nova-3</b><span>Telugu, Hindi, English mixed</span></div>
                  <div><small>Thinks</small><b>{bot.stack.llm.split(":").slice(1).join(":")}</b><span>{bot.stack.llm.split(":")[0]} free tier</span></div>
                  <div><small>Speaks</small><b>Murf Falcon 2.1</b><span>{bot.persona.voice.lang}</span></div>
                </div>
                <p className="note">{timing ? `Last voice test: ${(timing.total / 1000).toFixed(2)} s to the first sound.` : "Real reply times show here after a voice test. Say “voice test”."}</p>
              </div>
            </>
          )}
        </section>

        <section className={`scene ${scene === "call" ? "on" : ""}`}>
          {bot && (
            <>
              <span className="persona"><I d={IC.target} />You are the caller{persona ? ` · ${persona}` : ""} · speak as the customer</span>
              <div className="minimap"><Flow bot={bot} mini lit={path} cur={lastBot?.step_id} bad={badStep} good={lastBot?.fixed ? lastBot.step_id : undefined} /></div>
              <div className="subs">
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
            </>
          )}
        </section>

        <section className={`scene ${scene === "fix" ? "on" : ""}`}>
          {fix && (
            <>
              <div className="eyebrow">Point and speak · changed by voice</div>
              <h2>Fixed where it broke</h2>
              <div className="fixcard">
                <div className="fxn">
                  <span className="nb">{stepNo(fix.step) || "•"}</span>
                  <b>{bot?.flow.steps.find((s) => s.id === fix.step)?.label ?? "Reply"}</b>
                  {fix.rule && <span className="rchip">{fix.rule}</span>}
                </div>
                <div className="fxr was"><small>Before</small><div><p><s>{fix.before}</s></p></div></div>
                <div className="fxr now"><small>Now</small><div><p>{fix.summary}</p><em>Say “replay” to try the same line again.</em></div></div>
              </div>
            </>
          )}
        </section>

        <section className={`scene ${scene === "voice" ? "on" : ""}`}>
          {bot && (
            <>
              <span className="live"><i />Voice test · real mic → Deepgram → Groq → Murf</span>
              <button className={`micbtn ${rec ? "rec" : ""}`} aria-label="Hold to talk"
                onPointerDown={micStart} onPointerUp={micStop} onPointerLeave={micStop}>
                <I d={IC.mic} />
              </button>
              <p className="note">{rec ? "Listening… let go when you finish" : "Hold the button and talk like a real caller"}</p>
              <div className="big"><b>{timing ? `${(timing.total / 1000).toFixed(2)} s` : "0.00 s"}</b><span>to the bot’s first sound</span></div>
              {timing && (
                <>
                  <div className="bar">
                    <span style={{ background: "var(--s2)", flexGrow: timing.hear }}>Hearing {(timing.hear / 1000).toFixed(2)}s</span>
                    <span style={{ background: "var(--s3)", flexGrow: timing.think }}>Thinking {(timing.think / 1000).toFixed(2)}s</span>
                    {timing.speak > 0 && <span style={{ background: "var(--s4)", flexGrow: timing.speak }}>First sound {(timing.speak / 1000).toFixed(2)}s</span>}
                  </div>
                  <div className="legend">
                    <span><i style={{ background: "var(--s2)" }} />Hearing · Deepgram</span>
                    <span><i style={{ background: "var(--s3)" }} />Thinking · Groq</span>
                    <span><i style={{ background: "var(--s4)" }} />First sound · Murf</span>
                    {timing.left && <span>{timing.left} free voice replies left today</span>}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section className={`scene ${scene === "export" ? "on" : ""}`}>
          {bot && (
            <>
              <div className="eyebrow">Export · design here, run anywhere</div>
              <h2>Take it with you.</h2>
              <div className="xg x5">
                {EXPORTS.map((x, i) => (
                  <button key={x.id} className={`x ${i === 0 ? "on" : ""}`} style={{ ["--d" as string]: `${i * 0.06}s` }} onClick={() => exportAs(x.id)}>
                    <b>{x.name}</b><small>{x.note}</small><em><I d={IC.dl} />say “download {x.name.toLowerCase()}”</em>
                  </button>
                ))}
              </div>
              <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                <div><b>v{bot.version}</b><small>versions</small></div>
                <div><b>{bot.flow.steps.length}</b><small>steps</small></div>
                <div><b>{bot.rules.length}</b><small>rules</small></div>
              </div>
            </>
          )}
        </section>

        <section className={`scene ${scene === "bots" ? "on" : ""}`}>
          <div className="eyebrow">saved in this browser · no sign-in</div>
          <h2>My bots</h2>
          <BotList on={scene === "bots"} open={open} />
        </section>

        </main>
      <div className={`vig ${vig}`} />

      <div className="mic">
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

function BotList({ on, open }: { on: boolean; open: (d: Draft) => void }) {
  const list = on ? listDrafts() : [];
  if (!list.length) return <p className="empty">No bots yet. Say what you want to build.</p>;
  return (
    <div className="bots">
      {list.map((d, i) => (
        <button key={d.id} className="tile" style={{ ["--d" as string]: `${i * 0.05}s` }} onClick={() => open(d)}>
          <small>{d.id === SAMPLE_ID ? "Sample · " : ""}{d.bot ? `v${d.bot.version}` : "questions"}</small>
          <b>{d.bot?.name ?? d.interview?.name ?? "Untitled"}</b>
          <span>{(d.bot?.languages ?? d.interview?.understood.languages ?? []).map(langName).join(" · ")}</span>
        </button>
      ))}
    </div>
  );
}
