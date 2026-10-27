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

## Recording script: Rehearse (27 Oct, HyperFrames cut)

The video is cut in HyperFrames (HTML → MP4, rendered in the sandbox). Titles, the number, captions and the end card
are made there. Product screens with no voice in them (the saved rule break, the fix card, the proof page) are recorded
headlessly from the live site. Siddhu records only what must be real: Wispr in use, the live call, the voice-over.

Film (about 1:40): hook (the real broken Telugu line, red pencil, "3 weeks") → Rehearse title → build by voice →
rehearsal breaks rule 1 → fix by voice → replay passes → live Telugu call → 3.1 min vs about 3 weeks → built by voice
+ usage card → link.

### Set-up (once)
- Do Not Disturb on. Hide the Dock. Close other apps.
- Chrome **private window**, https://rehearse-ecru.vercel.app, dark theme, zoom 100%, full screen (Ctrl+Cmd+F).
- Check the Wispr Flow bar shows at the bottom of the screen while you hold Fn.
- Record with Cmd+Shift+5 → Record Entire Screen → Options → Microphone: MacBook microphone. Speakers on, no headphones
  (the Mac only records the bot's voice through the mic).
- Hold Fn for every spoken line. Wait for the result before the next line. Don't worry about waits: they are cut.

### Take 1: build by voice (Chrome)
1. "Start a new bot."
2. "Make an outbound sales bot for my booking app. It calls salon and clinic owners whose free trial ends in two
   days, and gets them to pick a paid plan or book a short demo. It speaks English, Hindi and Telugu."
3. When the questions show: "Basic has 100 bookings a month, Pro has 500. Never say a price on the call, send the
   pricing link on WhatsApp. Demos are 15 minutes, Monday to Saturday, 10 am to 6 pm. Never book a demo without a
   clear yes. If they only say hmm or okay, stay on the line."
4. When the flow shows: wait 3 s, "show the rules", wait 3 s, "show the flow". Stop recording.

### Take 2: fix by voice (Chrome)
1. "Watch a bot break a rule." Wait for the red line (about 8 s).
2. "If they ask for a refund, offer a manager callback instead."
3. When "Fixed where it broke" shows: "Replay." Wait for the green "Fixed · rule kept". Stop recording.

### Take 3: live voice call in Telugu (Chrome, the bot from Take 1)
1. "My bots", open the Booking App bot, then "voice test".
2. "Turn off interruptions." Then "start the call".
3. After the greeting, speak (no Fn, the call listens): "నమస్తే, నా ట్రయల్ రేపు అయిపోతుంది. ప్రో ప్లాన్ గురించి చెప్పండి."
4. Next: "సరే, బుధవారం పదకొండు గంటలకు డెమో బుక్ చేయండి."  Then: "అవును."
5. "End the call." Stop recording.

### Take 4: building by voice (Terminal, 10 s)
In Claude Code, hold Fn and dictate a real prompt, for example: "Add today's usage card total to the voice log."

### Take 5: the usage card (screenshot)
Wispr Flow → Insights → Your usage. Cmd+Shift+4, then Space, click the window.

### Round 2: voice-over (QuickTime → File → New Audio Recording)
Quiet room, 20 cm from the mic. Read each line, wait 2 s, next line. A bad line: just say it again; the last take wins.

1. My sales bot just promised a full refund. It's not allowed to.
2. Finding mistakes like this used to take me three weeks of calls.
3. So I built Rehearse. You build, rehearse and fix a phone bot, just by speaking.
4. I hold the Wispr key and describe the bot, like briefing a teammate.
5. It asks what it needs to know. I answer out loud.
6. Then it draws the call flow, the rules and the prompt.
7. Now I rehearse. A Telugu caller asks for a refund.
8. The bot promises one. Rehearse marks the line, and the rule it broke.
9. I say the fix.
10. Then I replay the same caller line, and the rule holds.
11. Then a real voice call, with a natural Telugu voice that runs in the browser.
12. On my own bot, the first rule break showed up 3.1 minutes after the brief.
13. Before, that took about three weeks of real and test calls.
14. I built Rehearse the same way, by speaking to Claude Code with Wispr Flow.
15. Open the link. No sign-in, and a sample bot is ready.

### Hand-off
Copy everything into `video/raw/` (git-ignored): `take1.mov` … `take4.mov`, `usage.png`, `vo.m4a`.
