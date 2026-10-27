# Demo video rules

**Length: at most 2:00. Target 1:50.** Unlisted YouTube, captions on. No slides.
Official: "A demo video of up to two minutes." / "A two-minute video anyone can follow." Blog: include "a short clip of Flow in use".
Quality bar (official sample): "A real call ends, I hold Fn and say what happened, and the email and the CRM note appear. I dictate two fixes and send."

## Shot list (6 beats)

| Time | Beat | On screen | What I say (keep it this short) |
|---|---|---|---|
| 0:00–0:15 | **Problem** | My real work context (blurred if private), then the app's first screen | "Every week I … It takes me about X minutes and I still miss …" |
| 0:15–0:55 | **Live use with Wispr** | Real screen recording: I hold the Wispr key, the Flow bar shows, I speak, text lands in the box, the result appears. One correction by voice. | Say only what I am doing: "I hold the key and say what I see." |
| 0:55–1:15 | **Real result with a number** | `docs/results.md` table or the app's own result view | "From 24 to 29 October I used it on N real … It took Y minutes instead of X." |
| 1:15–1:30 | **Flow in the build** | 5 s clip of me dictating a prompt to Claude Code (Flow bar visible), then `docs/voice-log.md` | "I built it the same way: every prompt to Claude Code was spoken." |
| 1:30–1:40 | **Usage card** | Wispr Flow > Insights > Your usage screenshot | "That is N words dictated during the challenge." |
| 1:40–1:50 | **How to try it** | Live URL in big text, first screen with sample data | "Open the link, no sign-in, sample data is already there." |

## Rules

1. The product is running on screen by **0:15**. No intro, no logo animation.
2. Say the real number out loud and show it on screen at the same time.
3. Record each beat as its own short take. Cut between takes. Never one long take.
4. No "one second", no waiting on screen. If something loads, cut the wait.
5. No reading the screen aloud. Say what it means.
6. Never speed up speech. If it is long, cut a whole beat.
7. Only real use. If a part is cached or sample, the screen already says so; don't hide it.
8. Nothing private: no client names, logos, faces, emails or confidential images. Blur if needed.
9. 1080p, browser zoom 125%, hide bookmarks bar and notifications (Do Not Disturb on).
10. Check captions for misheard words (product name, "Wispr", "Claude Code").

## Tools (free)

- Record: macOS screenshot tool (Cmd+Shift+5) with the microphone on, or QuickTime.
- Cut: iMovie or ffmpeg (Claude Code can cut with ffmpeg from timestamps I give).
- Source recordings: keep them in this folder under `video/raw/` (git-ignored) or copy from Movies (read/copy only, never edit or delete there).

## Before upload

- [ ] Length ≤ 1:55 in the player
- [ ] All 6 beats present, in order
- [ ] Number said and shown
- [ ] Flow bar visible at least twice (product use + build)
- [ ] Usage card visible ≥ 3 s
- [ ] Opens in a private window (unlisted, not private)

## Recording script: Rehearse (27 Oct)

Record each take on its own. Browser at 125%, dark mode, Do Not Disturb on. Hold the Wispr key for every spoken command.

| Take | Do | Say (voice-over, or live into Wispr) |
|---|---|---|
| 1. Problem (0:00–0:15) | Proof page | "I build phone bots in Telugu, Hindi and English. One sales bot took three weeks to stop breaking rules, because real callers found every mistake." |
| 2. Describe (0:15–0:35) | Home → hold Wispr → speak the brief of Bot 1 → questions appear → speak the answers | Live: the brief and answers from the test script. |
| 3. Rehearse (0:35–0:55) | "Rehearse a call" → "Hmm." → "How much for three staff?" → a reply turns red | "I play the caller. The bot just quoted a price. That's a rule it must never break." |
| 4. Fix (0:55–1:10) | Speak: "Fix this line: never give a price, send the pricing link on WhatsApp." → "Replay" → green | "I say the fix, replay the same line, and it passes." |
| 5. Voice call (1:10–1:25) | Voice test → Start the call → say one English line, then one Telugu line | Live call; the bot answers in Telugu with the natural voice. |
| 6. Number (1:25–1:35) | docs/results.md table | "First rule break caught 3.1 minutes after the brief, instead of three weeks of real calls." |
| 7. Built by voice + usage card (1:35–1:45) | 5 s of dictating to Claude Code, then the Wispr usage card | "I built it the same way: every prompt was spoken. That's N words with Wispr Flow." |
| 8. Try it (1:45–1:50) | Live URL on the first screen | "Open the link. No sign-in, a sample bot is ready." |
