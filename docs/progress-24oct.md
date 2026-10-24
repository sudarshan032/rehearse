# Progress while you were away (24 Oct evening)

Plain notes, newest at the bottom. Everything is on http://localhost:3000 and pushed to the private repo.
No money and no paid credits were used (only Groq's free tier).

## Done
- **Paste fix confirmed** from Wispr's own history (read from a copy): all 5 Chrome dictations were pasted by Wispr; the browser dropped 2. The page now inserts every paste itself.
- **@mentions**: click a step → `@Greet`; click another with nothing typed → replaced; Shift-click or double-click → added; `@Rule 2`, `@Fact 1`, `@Last reply`. They glow orange (red for `@Last reply`) and stay after a change. Text in the box is smaller (16 px).
- **Intro (2.5 s)** on the first screen: a messy spoken sentence, the "um", "uh" and "my users, actually no" get struck and cut, then a clean 3-step bot and a rule appear.
- **Sample bot**: Wispr Pro Sales Bot (Telugu, Hindi, English). Say "show me the sample", then "play the sample call": a Telugu caller asks about refunds, the bot promises one, rule 1 turns red, `@Last reply` is ready for your fix. Tested live: fix → "Fixed where it broke" → "replay" → green "Fixed · rule kept".
- **Export**: Bot JSON, Prompt, Vapi, Retell, Pipecat. Say "download vapi".
- **Mobile**: caption wraps; checked at 390 px.
- **README draft**: docs/README_DRAFT.md (proof numbers to fill on 29 Oct).
- **Free voice test** (no credits): your mic → Groq Whisper (free) → the bot (Groq) → KittenTTS in the browser for English, the Mac's own voices for Hindi (Lekha) and Telugu (Geeta). Murf and Deepgram are off unless `PAID_VOICE=1`. Measured in a test run: 1.92 s from letting go to the first sound (hearing 0.24 s, thinking 0.65 s, first sound 1.03 s). The first voice test loads the model (24 MB, about 7–11 s, once). Hold the mic button, or click to start and click to stop.
- **Speak the replies in a rehearsal**: say "speak the replies" (or "mute").
- **Whisper "Thank you."** on silence is treated as "heard nothing".
- **Free AI fallbacks**: if gpt-oss-120b is rate-limited, it tries qwen3.8-27b, gpt-oss-20b, then OpenRouter free models.
- **Zoom**: "zoom in", "zoom out", "fit".
- **Queued dictation**: if you speak while it's busy, it runs after, instead of gluing two commands together.

## Try this when you're back (2 minutes)
1. Reload http://localhost:3000 and watch the intro.
2. Say "show me the sample", then "play the sample call". Say the fix, then "replay".
3. Click two steps (Shift-click the second), say a change. Say "undo".
4. Say "voice test", hold the green button and ask something. (First time it loads the voice model.)
5. Say "export", then "download vapi".

## Known limits
- Voice test was checked with a recorded file sent to Whisper and with the in-browser voice, but not with a real microphone (the test browser has none). Your first real try is the real check.
- KittenTTS runs on the page's main thread: the page can pause about 1 s while it makes a sentence.
- Groq's free limits: heavy testing can hit "busy"; the fallbacks usually cover it.

## Later additions (same evening)
- **Building screen** shows 5 steps ticking while the AI works; the questions screen shows what it understood (languages, never/always rules).
- **"start a new bot"** works from any screen; very short lines on the first screen ask for more detail instead of building a bot from 2 words.
- **Busy free AI**: the message is short now, your words stay in the box (press Enter to resend), and short rate-limit waits (≤ 4 s) are waited out before falling back. Groq's free limit is 8,000 tokens per minute per model, so very fast back-to-back edits can still hit it.
- **Regression run (paced)**: new clinic reminder bot built from a brief + one spoken answer; a Hindi caller asked for medicine advice; the bot refused politely in Hindi and kept the rule.
