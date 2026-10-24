"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { langName, TOOL_SHELF, type Bot, type Interview } from "@/lib/bot";
import { guessIntent, personaOf, type Stage as SayStage, type Tab } from "@/lib/say";
import { getDraft, listDrafts, newId, post, saveDraft, type Draft } from "@/lib/store";
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
  describe: ["A sales bot that calls my free users", "నా saree shop కోసం ఒక support bot", "show my bots"],
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

const langOf = (s: string) => (/[ఀ-౿]/.test(s) ? "TE" : /[ऀ-ॿ]/.test(s) ? "HI" : "EN");
const ttsLang = (s: string, bot: Bot) => (/[ఀ-౿]/.test(s) ? "te-IN" : /[ऀ-ॿ]/.test(s) ? "hi-IN" : bot.languages.includes("en") ? "en-IN" : bot.persona.voice.lang);
const undoRe = /^(undo|undo that|undo it|revert|wapas karo)\b/i;
const replayRe = /^(replay|replay (it|that|the turn)|try (it )?again|again)\b/i;
const backRe = /^(back|go back|previous|wapas|venakki)\.?$/i;
const stopRe = /\b(stop|end|hang up|cut) (the )?call\b/i;
const moreRe = /\bask (me )?more\b/i;
const downloadRe = /\b(download|save it|export it)\b/i;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}
const slug = (s: string) => s.replace(/\W+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "bot";

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
  const [sel, setSel] = useState<Target | null>(null);
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
  const bot = draft?.bot;

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
    document.addEventListener("mouseup", refocus);
    window.addEventListener("focus", refocus);
    inp.current?.focus();
    return () => {
      document.removeEventListener("mouseup", refocus);
      window.removeEventListener("focus", refocus);
    };
  }, []);

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
    if (s === "describe") setSel(null);
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
    setSel(null);
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
      setSel({ kind: "turn", id: r.step_id, text: `Caller: ${t}\nBot: ${r.reply}`, label: `Fix → step ${step + 1}${ri >= 0 ? ` · rule ${ri + 1}` : ""}` });
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
      setSel(null);
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
    const stage = SAY_STAGE[scene];
    const pointing = !!sel;

    if (backRe.test(t)) return back(), say(t, "Back");
    if (undoRe.test(t) && bot) return doUndo(t);
    if (/^(dark|light)( mode)?$/i.test(t)) return toggleTheme(t.toLowerCase().startsWith("dark") ? "dark" : "light");
    if (scene === "fix" && replayRe.test(t)) return replay(t);
    if ((scene === "call" || scene === "fix") && stopRe.test(t)) return go("blueprint"), say(t, "Call stopped");
    if (scene === "export" && downloadRe.test(t) && bot) return exportJSON(), say(t, "Downloaded");
    if (scene === "bots") {
      const list = listDrafts();
      const m = /first/i.test(t) ? list[0] : list.find((d) => (d.bot?.name ?? d.interview?.name ?? "").toLowerCase().split(/\s+/).some((w) => w.length > 3 && t.toLowerCase().includes(w)));
      if (m) return open(m), say(t, `Opened ${m.bot?.name ?? m.interview?.name}`);
    }

    const g = guessIntent(stage, t, pointing);
    if (g?.intent === "navigate" && g.tab) return nav(t, g.tab);
    if (scene === "questions" && moreRe.test(t)) return askMore(t);

    if (scene === "describe" || scene === "bots") return brief(t);
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
        stage, text: t, bot, selection: sel ? { kind: sel.kind, id: sel.id, text: sel.text } : undefined,
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

  function nav(t: string, tab: Tab) {
    if (tab === "back") return back(), say(t, "Back");
    if (tab === "sample") return say(t, "The sample bot is coming soon", { ans: true });
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

  function open(d: Draft) {
    store(d);
    setUndo([]);
    setLines([]);
    setChanged(null);
    go(d.bot ? "blueprint" : "questions");
  }

  function exportJSON() {
    if (bot) download(`${slug(bot.name)}.json`, JSON.stringify(bot, null, 2), "application/json");
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
    if (!busy && queued.current) {
      queued.current = false;
      handle(inp.current?.value ?? "");
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
        timer.current = setTimeout(() => handle(el.value), 1200);
      }
    }, 300);
    return () => clearInterval(id);
  });

  // Wispr pastes a whole sentence at once: send it after a short countdown. Typing waits for Enter.
  function onInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const v = e.currentTarget.value;
    const ie = e.nativeEvent as InputEvent;
    const jump = v.length - text.length;
    setText(v);
    clearTimeout(timer.current);
    if (ie.inputType === "insertFromPaste" || ie.inputType === "insertReplacementText" || jump > 1) {
      setCounting(true);
      timer.current = setTimeout(() => handle(v), 1200);
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
      } else if (sel) setSel(null);
      else if (!text) back();
    }
  }

  function pickStep(id: string) {
    if (!bot) return;
    const i = bot.flow.steps.findIndex((s) => s.id === id);
    setSel({ kind: "step", id, label: `Change → step ${i + 1} · ${bot.flow.steps[i].label}` });
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

      <main>
        <section className={`scene ${scene === "describe" ? "on" : ""}`}>
          <div className="eyebrow">Rehearse · build a voice bot by talking</div>
          <h1>What voice bot do you want to build?</h1>
          <div className="tryline in">“A sales bot that calls my free users” · “నా saree shop కోసం ఒక support bot”</div>
          <p className="sub0">Hold <kbd>fn</kbd> and talk, in English, हिंदी, తెలుగు or a mix. I’ll ask a few questions, then build it.</p>
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
                <Flow bot={bot} chg={changed?.steps} sel={sel?.kind === "step" ? sel.id : undefined} onPick={pickStep} />
              </div>
              <div className="tiles">
                {([["rules", `${bot.rules.length}`, "Rules", `${bot.rules.filter((r) => r.kind === "never").length} never · ${bot.rules.filter((r) => r.kind === "always").length} always`],
                  ["knowledge", `${bot.knowledge.length}`, "Facts", "what it may say"],
                  ["prompt", `${Math.round(bot.prompt.length / 100) / 10}k`, "Prompt", "characters, built for you"],
                  ["stack", "3", "Stack", "Deepgram · Groq · Murf"]] as const).map(([s, big, name, note], i) => (
                  <button key={s} className="tile" style={{ ["--d" as string]: `${0.5 + i * 0.07}s` }} onClick={() => go(s)}>
                    <small>say “show {name.toLowerCase()}”</small><b>{big} {name}</b><span>{note}</span>
                  </button>
                ))}
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
                    className={`rcard ${r.suggested ? "sug" : ""} ${r.kind === "always" ? "ok" : ""} ${sel?.id === r.id ? "sel" : ""} ${changed?.rules.includes(r.id) ? "chg" : ""}`}
                    onClick={() => setSel({ kind: "rule", id: r.id, label: `Change → rule ${i + 1}` })}>
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
                  <ol>{bot.knowledge.map((k) => <li key={k.id} className={changed?.knowledge.includes(k.id) ? "chg" : ""} onClick={() => setSel({ kind: "knowledge", id: k.id, label: `Change → fact` })}>{k.text}</li>)}</ol>
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
              <div className="big"><b>{timing ? `${(timing.total / 1000).toFixed(2)} s` : "–"}</b><span>to the bot’s first sound</span></div>
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
              <div className="xg" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <button className="x on" onClick={exportJSON}><b>Bot JSON</b><small>flow, rules, facts, stack</small><em><I d={IC.dl} />say “download”</em></button>
                <button className="x" onClick={() => download(`${slug(bot.name)}-prompt.md`, bot.prompt, "text/markdown")}><b>Prompt</b><small>Markdown, paste anywhere</small><em><I d={IC.dl} />click to save</em></button>
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
          <span className={`tgt ${sel?.kind === "turn" ? "bad" : sel ? "chg" : scene === "call" ? "call" : ""}`} onClick={() => setSel(null)} title="Esc to clear">
            {sel ? <><I d={IC.target} /><span>{sel.label}</span></> : scene === "call" ? <><I d={IC.target} /><span>Caller</span></> : null}
          </span>
          <textarea ref={inp} id="inp" rows={1} value={text} onInput={onInput} onChange={() => {}} onKeyDown={onKey}
            placeholder={busy ? `${busy}…` : PLACEHOLDER[scene] ?? "Say what to do…"} aria-label="Talk or type to Rehearse" autoFocus />
          <span className="fnh">hold <kbd>fn</kbd></span>
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
          <small>{d.bot ? `v${d.bot.version}` : "questions"}</small>
          <b>{d.bot?.name ?? d.interview?.name ?? "Untitled"}</b>
          <span>{(d.bot?.languages ?? d.interview?.understood.languages ?? []).map(langName).join(" · ")}</span>
        </button>
      ))}
    </div>
  );
}
