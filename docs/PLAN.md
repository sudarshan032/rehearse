# Plan: Rehearse, 24 → 31 Oct 2026

**Deadline:** Sat 31 Oct, 11:59 pm IST. **Submit:** Fri 30 Oct (no edits after). **31 Oct:** spare day only.
**Spec:** `docs/SPEC.md`. **Features:** `docs/REHEARSE_FEATURES.md`.

## Rules for every day
- Build fast; no idea re-opening. Change details while building, not the idea.
- One local URL (http://localhost:8768 until the Next.js app takes over on its dev port; then only that one). One Vercel URL.
- No test loops, no benchmarks; protect Murf's $10. Free tiers only.
- Background anything that takes > 2 minutes; read results once.
- Dictate with Wispr; log words in `docs/voice-log.md` each evening.
- Commit at the end of each working block (plain messages, no AI attribution).

## Day by day

| Day | Goal | Done when |
|---|---|---|
| **Sat 24** | Spec + plan (done). Scaffold Next.js app (private GitHub repo `rehearse`), Vercel project, `.env` wired (Groq, OpenRouter, Deepgram, Murf). `/api/interview` + `/api/blueprint` with schemas. Describe → Interview → Blueprint (static view) working end to end on a real LLM. Deploy. | A real brief produces real questions and a real Bot JSON on the live URL |
| **Sun 25** | Flow canvas (React Flow + auto layout), Rules, Knowledge, Prompt tabs. **Point and speak** edits (`/api/edit`) with highlight. Bots saved in browser. **LinkedIn post 1** (the problem + first screen). | I can build a bot and change it by voice; it survives a reload |
| **Mon 26** | **Rehearse** (text call): `/api/turn` + `/api/check`; path lights up; red rule bubble + red step; fix at the red spot; replay turn; caller personas. **Real use starts**: build 2 real bots from my own work. | A rehearsal catches a real rule break and the fix turns it green |
| **Tue 27** | **Voice test**: hold-to-talk → Deepgram → Groq → Murf; bot speaks; per-turn timing bar; daily cap. Stack & speed tab (cards, estimate bar, "make it faster" knobs, voice picker, bring-your-own-key dialog). Export (JSON + prompt; Pipecat/Vapi/Retell formats if time). **LinkedIn post 2** (rehearse + red rule clip). | A real spoken call works on the live URL with measured reply times |
| **Wed 28** | **Design pass** (the only one), sample mode with cached audio, AI-off fallback, My bots, Proof page, Telugu typing toggle (if time). README draft. Real use: measure before/after. **Feature freeze 10 pm IST.** | Judge path works in 30 s from a cold open, on desktop and phone |
| **Thu 29** | Record the 1:50 video (script in `docs/DEMO.md`), captions, upload unlisted. Final README, Proof numbers, usage card. **dev.to blog** draft. **LinkedIn post 3** (real result). | Video ≤ 1:55 uploaded; README final |
| **Fri 30** | Final checks (private window, phone, AI off). Repo public. **Submit** (7 fields, `docs/SUBMISSION.md`). Publish blog. **LinkedIn post 4**. | Submitted |
| Sat 31 | Spare. Fix only if something is broken. | — |

## Real use and the number (from 26 Oct)
- Build at least 3 real bots: a sales bot (sample: Wispr Pro), a support bot modelled on my SIIMA work (generic, no SIIMA data), a personal daily-brief bot.
- Measure: minutes from brief to first passing rehearsal (Rehearse) vs my usual manual way at SIIMA (estimate from my logs, stated honestly); rule breaks caught before any real call; measured reply time in Voice test.
- Write each run in `docs/results.md` (date, bot, minutes, breaks caught, fixes, reply ms).

## Risks and fallbacks
| Risk | Fallback |
|---|---|
| LLM returns bad JSON | Schema check + one retry + friendly error; keep last good version |
| Free LLM rate limit | Switch Groq ↔ OpenRouter; sample mode still works |
| Murf credits run low | Daily cap, cached audio, Gemini TTS (if key), honest "voice preview limit reached" |
| Flow layout looks messy | Auto layout + max 9 steps per bot |
| Running out of time | Cut in this order: Telugu typing, platform-specific export, caller personas, suggested rules |
