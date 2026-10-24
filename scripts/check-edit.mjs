// Self-check for the edit ops and the input-box keywords. Run: node scripts/check-edit.mjs
// Node 22.18+ runs the .ts files directly; the hook resolves "@/..." imports the way Next does.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

process.removeAllListeners("warning"); // Node notes the .ts files have no module type: harmless here
const root = new URL("../", import.meta.url);
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith("@/")) spec = new URL(spec.slice(2), root).href;
    if (/^(file:|\.)/.test(spec) && !/\.[cm]?[jt]s$/.test(spec)) spec += ".ts";
    return next(spec, ctx);
  },
});
const { applyOps, EditError } = await import("../lib/edit.ts");
const { guessIntent, personaOf } = await import("../lib/say.ts");

const step = (id, kind = "step") => ({ id, label: id, says: `Say ${id}.`, kind });
const link = (from, to, when = "always") => ({ from, to, when });
const bot = {
  id: "t1", version: 1, name: "Test", type: "sales", goal: "Sell", callers: "Leads", languages: ["en"],
  follow_caller_language: true, persona: { tone: "warm", voice: { provider: "murf", lang: "en-IN" } },
  knowledge: [{ id: "k1", text: "Pro costs 12 dollars" }],
  rules: [{ id: "r1", kind: "never", text: "Promise a refund", source: "brief", suggested: false }],
  tools: [{ id: "callback", enabled: true }],
  flow: {
    steps: [step("greet", "start"), step("pitch"), step("book"), step("bye", "end")],
    links: [link("greet", "pitch"), link("pitch", "book", "interested"), link("pitch", "bye", "not interested"), link("book", "bye")],
  },
  stack: { stt: "deepgram:nova-3", llm: "groq:test", tts: "murf:falcon-2.1" },
  prompt: "",
};

const r = applyOps(bot, [
  { op: "add_step", id: "Ask Student", label: "Ask if student", says: "Are you a student?", after: "greet" },
  { op: "add_rule", kind: "always", text: "Always confirm the email" },
  { op: "remove_step", id: "book" },
  { op: "set_languages", languages: ["Telugu", "en"] },
  { op: "update_step", id: "nope", says: "x" }, // missing step: skipped
  { op: "fly" }, // unknown op: skipped
]);
assert.equal(r.applied, 4);
assert.equal(r.bot.version, 2);
assert.equal(bot.version, 1, "the original bot is not touched");
assert.deepEqual(r.bot.flow.steps.map((s) => s.id), ["greet", "ask_student", "pitch", "bye"]);
assert.deepEqual(r.bot.flow.links.map((l) => `${l.from}>${l.to}:${l.when}`).sort(), [
  "ask_student>pitch:always", "greet>ask_student:always", "pitch>bye:not interested",
]);
assert.deepEqual(r.bot.rules[1], { id: "r2", kind: "always", text: "Confirm the email", source: "edit", suggested: false });
assert.deepEqual(r.bot.knowledge, bot.knowledge, "unrelated parts stay the same");
assert.deepEqual(r.bot.languages, ["te", "en"]);
assert.equal(r.bot.persona.voice.lang, "te-IN");
assert.ok(r.bot.prompt.includes("Are you a student?"));
assert.deepEqual(r.changed, { steps: ["ask_student", "pitch"], rules: ["r2"], knowledge: [], fields: ["languages"] });

const none = applyOps(bot, [{ op: "remove_rule", id: "r9" }]);
assert.equal(none.bot, bot);
assert.equal(none.applied, 0);
const many = Array.from({ length: 11 }, (_, i) => ({ op: "add_step", id: `s${i}`, label: "x", says: "y" }));
assert.throws(() => applyOps(bot, many), EditError, "more than 14 steps is refused");

const g = (stage, text, pointing) => guessIntent(stage, text, pointing)?.intent ?? null;
assert.deepEqual(guessIntent("blueprint", "show me the rules"), { intent: "navigate", tab: "rules" });
assert.equal(guessIntent("blueprint", "prompt kholo").tab, "prompt");
assert.equal(guessIntent("blueprint", "export it").tab, "export");
assert.equal(g("blueprint", "After the greeting, ask if they're a student"), "edit");
assert.equal(g("blueprint", "Why does it ask the name first?"), "question");
assert.equal(g("blueprint", "can you make the greeting shorter?"), "edit");
assert.equal(g("blueprint", "Let's rehearse as an angry customer"), "rehearse_start");
assert.equal(personaOf("Let's rehearse as an angry customer"), "angry customer");
assert.equal(g("interview", "just build it"), "build_now");
assert.equal(g("interview", "We sell gym plans, 999 a month, never promise discounts"), "answers");
assert.equal(g("rehearse", "Hi, mera order abhi tak nahi aaya"), "caller_turn");
assert.equal(g("rehearse", "the bot should not promise a refund here"), "edit");
assert.equal(g("rehearse", "say we will check with the team", true), "edit");
assert.equal(g("rehearse", "Are you a bot?"), null);
console.log("check-edit: all good");
