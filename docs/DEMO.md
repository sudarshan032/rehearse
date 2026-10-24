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
