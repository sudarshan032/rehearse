import { z } from "zod";
import { BotDraft, LANGS, TOOL_SHELF, compilePrompt, type Bot } from "@/lib/bot";
import { askJSON, fail } from "@/lib/llm";
import { EDIT_SYSTEM, editUser } from "@/lib/prompts-edit";

// "Point and speak". The LLM only returns a short list of operations; code applies them to a copy
// of the bot, so parts the user did not mention cannot change.

const str = (max: number) => z.string().transform((s) => s.trim().slice(0, max));
const opt = (max: number) => str(max).optional().catch(undefined);
const ruleKind = z.enum(["never", "always"]);

export const Op = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add_step"), id: str(36), label: str(40), says: str(400), kind: z.enum(["step", "end"]).catch("step"), after: opt(40) }),
  z.object({ op: z.literal("update_step"), id: str(40), label: opt(40), says: opt(400), kind: z.enum(["start", "step", "end"]).optional().catch(undefined) }),
  z.object({ op: z.literal("remove_step"), id: str(40) }),
  z.object({ op: z.literal("add_link"), from: str(40), to: str(40), when: str(60).catch("always") }),
  z.object({ op: z.literal("remove_link"), from: str(40), to: str(40) }),
  z.object({ op: z.literal("add_rule"), kind: ruleKind, text: str(200) }),
  z.object({ op: z.literal("update_rule"), id: str(40), kind: ruleKind.optional().catch(undefined), text: opt(200) }),
  z.object({ op: z.literal("remove_rule"), id: str(40) }),
  z.object({ op: z.literal("add_knowledge"), text: str(400) }),
  z.object({ op: z.literal("update_knowledge"), id: str(40), text: str(400) }),
  z.object({ op: z.literal("remove_knowledge"), id: str(40) }),
  z.object({ op: z.literal("set"), field: z.enum(["name", "goal", "callers", "tone"]), value: str(400) }),
  z.object({ op: z.literal("set_languages"), languages: z.array(z.string()).max(5), follow_caller_language: z.boolean().optional().catch(undefined) }),
  z.object({ op: z.literal("set_tool"), id: str(40), enabled: z.boolean() }),
]);
export type Op = z.infer<typeof Op>;

// What the LLM returns. Each op is checked on its own in applyOps, so one bad op cannot sink the rest.
export const EditPlan = z.object({ ops: z.array(z.unknown()).max(20), summary: str(240).catch("") });

// What the user is pointing at. text = the words on screen there (a call turn, or prompt lines).
export const Target = z.object({
  kind: z.enum(["step", "rule", "knowledge", "prompt", "turn"]),
  id: z.string().max(40).optional(),
  text: z.string().max(1500).optional(),
});
export type Target = z.infer<typeof Target>;

// The bot the browser sends back: the built fields are checked, anything extra is kept as it is.
export const BotIn = BotDraft.extend({
  id: z.string().min(1).max(40),
  version: z.number().int().min(0).max(1e6),
  persona: z.looseObject({
    tone: z.string().max(120),
    voice: z.looseObject({ provider: z.string().max(40), lang: z.string().max(20) }).catch({ provider: "murf", lang: "en-IN" }),
  }),
  stack: z
    .looseObject({ stt: z.string().max(80), llm: z.string().max(120), tts: z.string().max(80) })
    .catch({ stt: "deepgram:nova-3", llm: "groq", tts: "murf:falcon-2.1" }),
  prompt: z.string().max(30_000).catch(""),
}).loose();

export type Changed = { steps: string[]; rules: string[]; knowledge: string[]; fields: string[] };
export class EditError extends Error {}

const LANG_CODE: Record<string, string> = { te: "te", telugu: "te", hi: "hi", hindi: "hi", en: "en", english: "en" };
const MAX = { name: 60, goal: 400, callers: 300, tone: 120 };
const cleanRule = (t: string) => t.replace(/^(never|always)\b[:,]?\s*/i, "").replace(/^./, (c) => c.toUpperCase());
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 36) || "step";
const nextId = (p: string, items: { id: string }[]) => p + (1 + Math.max(0, ...items.map((i) => Number(i.id.slice(p.length)) || 0)));
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const mainLang = (langs: string[]) => langs.find((l) => LANGS[l]) ?? "en";

/** Apply the ops to a copy of the bot. Ops that point at missing parts are skipped. */
export function applyOps(old: Bot, ops: unknown[]): { bot: Bot; changed: Changed; applied: number } {
  const b: Bot = structuredClone(old);
  const f = b.flow;
  const hit = { steps: new Set<string>(), rules: new Set<string>(), knowledge: new Set<string>(), fields: new Set<string>() };
  const alias: Record<string, string> = {}; // id the LLM gave a new step -> the id it got
  const byId = (id: string) => f.steps.find((s) => s.id === id);
  const step = (id: string) => byId(alias[id] ?? id);
  const linked = (from: string, to: string) => f.links.find((l) => l.from === from && l.to === to);

  const run = (o: Op): boolean => {
    switch (o.op) {
      case "add_step": {
        if (!o.label || !o.says) return false;
        const prev = o.after ? step(o.after) : undefined;
        const base = slug(o.id);
        let id = base;
        for (let n = 2; byId(id); n++) id = `${base}_${n}`;
        alias[o.id] = alias[base] = id;
        const s = { id, label: o.label, says: o.says, kind: o.kind };
        if (prev) {
          // Insert into the call: the new step takes over prev's links out, and prev now leads to it.
          for (const l of f.links) if (l.from === prev.id) l.from = id;
          f.links.push({ from: prev.id, to: id, when: "always" });
          if (prev.kind === "end") {
            prev.kind = "step";
            s.kind = "end";
          }
          f.steps.splice(f.steps.indexOf(prev) + 1, 0, s);
        } else {
          const end = f.steps.findIndex((x) => x.kind === "end");
          f.steps.splice(end < 0 ? f.steps.length : end, 0, s);
        }
        hit.steps.add(id);
        return true;
      }
      case "update_step": {
        const s = step(o.id);
        if (!s || !(o.label || o.says || o.kind)) return false;
        if (o.label) s.label = o.label;
        if (o.says) s.says = o.says;
        if (o.kind === "start") for (const x of f.steps) if (x.kind === "start") x.kind = "step";
        if (o.kind) s.kind = o.kind;
        hit.steps.add(s.id);
        return true;
      }
      case "remove_step": {
        const s = step(o.id);
        if (!s) return false;
        const ins = f.links.filter((l) => l.to === s.id && l.from !== s.id);
        const outs = f.links.filter((l) => l.from === s.id && l.to !== s.id);
        f.steps = f.steps.filter((x) => x !== s);
        f.links = f.links.filter((l) => l.from !== s.id && l.to !== s.id);
        // Keep the call connected: what led here now goes where this step went.
        for (const i of ins)
          for (const out of outs) if (i.from !== out.to && !linked(i.from, out.to)) f.links.push({ from: i.from, to: out.to, when: i.when });
        for (const i of ins) {
          const p = byId(i.from);
          if (p?.kind === "step" && !f.links.some((l) => l.from === p.id)) p.kind = "end";
          hit.steps.add(i.from);
        }
        if (s.kind === "start") {
          const next = byId(outs[0]?.to ?? "") ?? f.steps[0];
          if (next) next.kind = "start";
        }
        return true;
      }
      case "add_link": {
        const a = step(o.from);
        const c = step(o.to);
        if (!a || !c) return false;
        const l = linked(a.id, c.id);
        if (l) l.when = o.when || "always";
        else f.links.push({ from: a.id, to: c.id, when: o.when || "always" });
        if (a.kind === "end") a.kind = "step";
        hit.steps.add(a.id);
        return true;
      }
      case "remove_link": {
        const a = step(o.from);
        const c = step(o.to);
        if (!a || !c || !linked(a.id, c.id)) return false;
        f.links = f.links.filter((l) => l.from !== a.id || l.to !== c.id);
        hit.steps.add(a.id);
        return true;
      }
      case "add_rule": {
        const text = cleanRule(o.text);
        if (!text || b.rules.some((r) => r.kind === o.kind && same(r.text, text))) return false;
        const id = nextId("r", b.rules);
        b.rules.push({ id, kind: o.kind, text, source: "edit", suggested: false });
        hit.rules.add(id);
        return true;
      }
      case "update_rule": {
        const r = b.rules.find((x) => x.id === o.id);
        if (!r || !(o.kind || o.text || r.suggested)) return false;
        if (o.kind || o.text) r.source = "edit";
        if (o.kind) r.kind = o.kind;
        if (o.text) r.text = cleanRule(o.text);
        r.suggested = false; // the user has now chosen it
        hit.rules.add(r.id);
        return true;
      }
      case "remove_rule": {
        const n = b.rules.length;
        b.rules = b.rules.filter((r) => r.id !== o.id);
        return b.rules.length < n;
      }
      case "add_knowledge": {
        if (!o.text || b.knowledge.some((k) => same(k.text, o.text))) return false;
        const id = nextId("k", b.knowledge);
        b.knowledge.push({ id, text: o.text });
        hit.knowledge.add(id);
        return true;
      }
      case "update_knowledge": {
        const k = b.knowledge.find((x) => x.id === o.id);
        if (!k || !o.text) return false;
        k.text = o.text;
        hit.knowledge.add(k.id);
        return true;
      }
      case "remove_knowledge": {
        const n = b.knowledge.length;
        b.knowledge = b.knowledge.filter((k) => k.id !== o.id);
        return b.knowledge.length < n;
      }
      case "set": {
        const v = o.value.slice(0, MAX[o.field]);
        if (!v) return false;
        if (o.field === "tone") b.persona.tone = v;
        else b[o.field] = v;
        hit.fields.add(o.field);
        return true;
      }
      case "set_languages": {
        const langs = [...new Set(o.languages.map((l) => LANG_CODE[l.trim().toLowerCase()]).filter(Boolean))].slice(0, 3);
        if (!langs.length) return false;
        if (mainLang(langs) !== mainLang(b.languages))
          b.persona.voice = { provider: b.persona.voice.provider, lang: LANGS[mainLang(langs)].voice };
        b.languages = langs;
        if (o.follow_caller_language !== undefined) b.follow_caller_language = o.follow_caller_language;
        hit.fields.add("languages");
        return true;
      }
      case "set_tool": {
        if (!TOOL_SHELF[o.id]) return false;
        const t = b.tools.find((x) => x.id === o.id);
        if (t) t.enabled = o.enabled;
        else if (o.enabled) b.tools.push({ id: o.id, enabled: true });
        else return false;
        hit.fields.add("tools");
        return true;
      }
    }
  };

  let applied = 0;
  for (const raw of ops) {
    const o = Op.safeParse(raw);
    if (o.success && run(o.data)) applied++;
  }
  if (!applied) return { bot: old, changed: { steps: [], rules: [], knowledge: [], fields: [] }, applied };
  const check = BotDraft.safeParse(b);
  if (!check.success) throw new EditError(limitMessage(check.error.issues[0]?.path.join(".") ?? ""));
  b.version = old.version + 1;
  b.prompt = compilePrompt(b);
  const kept = (set: Set<string>, list: { id: string }[]) => list.map((x) => x.id).filter((id) => set.has(id));
  return {
    bot: b,
    changed: { steps: kept(hit.steps, f.steps), rules: kept(hit.rules, b.rules), knowledge: kept(hit.knowledge, b.knowledge), fields: [...hit.fields] },
    applied,
  };
}

function limitMessage(path: string) {
  if (path === "flow.steps") return "A call flow needs 3 to 10 steps. Remove or merge a step first.";
  if (path === "flow.links") return "That makes too many branches (24 at most). Remove one first.";
  if (path === "rules") return "A bot can have 16 rules at most. Remove one first.";
  if (path === "knowledge") return "A bot can hold 20 facts at most. Remove one first.";
  return "That change does not fit this bot. Try saying it another way.";
}

/** One LLM call turns the spoken change into ops; code applies them. */
export async function editBot(bot: Bot, instruction: string, target?: Target) {
  const { data, llm, ms } = await askJSON(EDIT_SYSTEM, editUser(bot, instruction, target), EditPlan);
  const r = applyOps(bot, data.ops);
  const summary = r.applied
    ? data.summary || "Done."
    : data.ops.length
      ? "I couldn't make that change. Try saying it another way."
      : data.summary || "Nothing to change.";
  return { bot: r.bot, summary, changed: r.changed, applied: r.applied, llm, ms };
}

/** Parse a JSON body, refusing anything over max characters. */
export async function readJSON(req: Request, max = 200_000): Promise<unknown> {
  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > max) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function failEdit(e: unknown) {
  return e instanceof EditError ? Response.json({ error: e.message }, { status: 422 }) : fail(e);
}
