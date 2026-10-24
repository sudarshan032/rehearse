// Self test for the keyword part of the rule check (no AI, no server): node scripts/check-rules.mjs
import assert from "node:assert/strict";
import { keywordCheck } from "../lib/rule-check.ts";

const rules = [
  { id: "refund", kind: "never", text: "Promise a refund" },
  { id: "free", kind: "never", text: "Say Wispr Flow is free forever" },
  { id: "discount", kind: "never", text: "Give a discount above 10%" },
  { id: "lang", kind: "always", text: "Reply in the caller's language" },
];
const cases = [
  ["Don't worry, you'll get a full refund.", "", ["refund"]],
  ["I can't promise a refund, but I can raise a request.", "", []],
  ["Aapko pura refund milega, aur Flow hamesha free rahega.", "", ["refund", "free"]],
  ["మీ డబ్బులు తిరిగి వస్తాయి, 20% డిస్కౌంట్ కూడా ఇస్తాం.", "నాకు refund కావాలి", ["refund", "discount"]],
  ["मैं आपको 20% डिस्काउंट दे सकता हूँ।", "कुछ डिस्काउंट मिलेगा?", ["discount"]],
  ["Thank you for calling, your order is on the way.", "నా order ఎక్కడ ఉంది?", ["lang"]],
];

assert.deepEqual(
  cases.map(([reply, caller]) => keywordCheck(rules, reply, caller).broken.map((b) => b.rule_id)),
  cases.map(([, , want]) => want),
);
console.log(`check-rules: ${cases.length} replies OK (English, Hinglish, Telugu, Hindi)`);
