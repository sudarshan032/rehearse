# Before every release: 10-minute check

Run on a real laptop (Chrome), once in dark and once in light mode, then once at phone width.

1. **First screen:** "Watch a bot break a rule" plays the sample call with nothing jumping; rule 1 turns red; you can scroll back through the call.
2. **Fix loop:** say the suggested fix → Changes shows Before/Now → "Replay the same line" shows "Fixed · rule kept" → "Undo this fix" goes back a version.
3. **Caller words stay caller words:** on a call, say "Go ahead", "Continue", "Fix it!", "Download is slow". None of them may leave the call or download a file.
4. **Commands still work:** "show me the rules", "go to the prompt page", "next", "back", "scroll down", "drop the panel", "dark mode", "copy the prompt".
5. **Edits that look like commands:** "Open the call with Namaste", "Revert to English if they are confused", "Offer a free demo" must change the bot, not navigate, undo or open the sample.
6. **Mentions:** click a step → `@Step` in the box; Backspace removes it in one press; after a change the box is empty.
7. **Voice test (real mic, no headphones, then with headphones):** the bot greets; talk; it replies out loud with the words lighting up; talk over it once and it stops; it never cuts itself off while you're silent. Check `.cache/session.log` for `call-barge` and `call-heard`.
8. **Leaving mid-way:** start an edit or a brief, then click another screen before it finishes. You must stay where you clicked.
9. **Reload** on any screen: same bot, same screen.
10. **My bots:** open, remove (two clicks), describe a new bot while one is open, "Back to it".

If the free AI is busy (Groq 429), the app must say so and keep your words in the box. It must never claim "rules kept" when the rule check didn't run. The sample fix and "replay" still work with the AI off (saved answers).
