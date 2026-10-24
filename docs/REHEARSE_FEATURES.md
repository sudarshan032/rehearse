# Rehearse: full feature list (draft for the spec, 24 Oct 2026)

**One line:** Talk your voice bot into shape, then call it before your customers do. Build, rehearse and fix a voice agent just by speaking, in Telugu, Hindi or English, and watch it work.

**Priority:** **M** = must (the hackathon entry), **S** = should (if time), **C** = could (stretch), **L** = later (after the hackathon, product ideas).
**Wispr** column: where Wispr Flow does real work.

## 1. Describe (start screen)

| # | Feature | What it does | Wispr | P |
|---|---|---|---|---|
| 1.1 | Big "What bot do you want to build?" box | Hold fn and describe the bot in any mix of Telugu, Hindi, English | Brief writer | M |
| 1.2 | Starting points | Sales bot, Support bot, Daily brief caller (fill a sample brief) | | M |
| 1.3 | Works without Wispr | Same box accepts typing, so any judge can try | | M |
| 1.4 | Telugu typing | Type Telugu in English letters ("vachavu" → వచ్చావు), in-browser IndicXlit, 3 suggestions | | S |
| 1.5 | Bot type detection | Recognises sales / support / personal / other from the brief | | M |

## 2. Interview (the builder asks)

| # | Feature | What it does | Wispr | P |
|---|---|---|---|---|
| 2.1 | Follow-up questions | 3–6 questions chosen for the bot type (sales: product, plans, offers, never-promise; support: problems, policies, handover; personal: sources, time, format) | Answers by voice | M |
| 2.2 | "What I understood" panel | Live summary: goal, callers, languages, knowledge, rules, tools; updates after each answer | | M |
| 2.3 | Skip / ask me more | Build now, or let it ask more | | M |
| 2.4 | Correct by voice | "No, it should also speak Tamil" updates the summary | Edit by voice | S |
| 2.5 | Paste knowledge | Paste a pricing page / FAQ text; it becomes knowledge | | S |

## 3. Blueprint (the bot, built)

| # | Feature | What it does | Wispr | P |
|---|---|---|---|---|
| 3.1 | Call flow, drawn automatically | Steps and branches as boxes and arrows, generated from the answers | | M |
| 3.2 | Edit the flow by voice | "After the greeting, ask if they're a student" → flow rewires, change highlighted | Edit by voice | M |
| 3.3 | Rules (guardrails) | "Never" and "always" rules as a list, each traceable to the answer it came from | | M |
| 3.4 | Suggested rules | Builder proposes common rules (end call after two "not interested"); say keep/remove | | S |
| 3.5 | Knowledge | Product facts, plans, offers, FAQs the bot may use | | M |
| 3.6 | Persona and languages | Name, tone, languages, "follow the customer's language" | | M |
| 3.7 | Tools | Pick from a small shelf: book a callback, transfer to human, look up order (mock data), send summary | | S (2 tools M) |
| 3.9 | System prompt view | The full prompt the bot runs on, generated from flow + rules + knowledge; edit it by voice or typing, and the flow/rules update to match | Edit by voice | M |
| 3.10 | Point and speak | Click any step, rule or chat turn, hold fn and say the change; it applies to that exact spot | Edit by voice | M |
| 3.8 | Undo / version history | Every voice change is a version; undo by voice or button | | S |

## 4. Rehearse (talk to the bot)

| # | Feature | What it does | Wispr | P |
|---|---|---|---|---|
| 4.1 | Rehearse a call | You play the customer by voice; the bot (real AI model) answers following its blueprint | Caller's voice (the "ears") | M |
| 4.2 | Path lights up | The flow highlights the step the call is on, turn by turn | | M |
| 4.3 | Rule broken → red | When a reply breaks a rule, the bubble and the step turn red and name the rule | | M |
| 4.4 | Fix at the red spot | Say the fix; blueprint updates; "replay this turn" shows the new answer | Edit by voice | M |
| 4.9 | Two test modes | **Rehearse** (fast, free: you speak as the caller via Wispr, bot answers in text, rules checked) and **Voice test** (the bot's real STT → LLM → TTS chain, so you hear it and see real reply times) | Rehearse uses Wispr | M (both) |
| 4.5 | Caller personas | One click: angry customer, confused elderly caller, switches to Hindi mid-call | | S |
| 4.6 | Auto-rehearse | The AI plays 5 different customers against the bot and reports rule breaks and dead ends | | C |
| 4.7 | Bot speaks the reply | Natural voice for the bot's reply (Telugu/Hindi/English) | | M (provider to be picked by test) |
| 4.8 | Call report | After a rehearsal: outcome, steps visited, rules broken, fixes made | | S |

## 5. Stack and speed

| # | Feature | What it does | Wispr | P |
|---|---|---|---|---|
| 5.1 | Stack card | Hears (STT) / thinks (LLM) / speaks (TTS) picked from spoken goals ("Telugu callers, fast, cheap") using a provider catalog | Goals by voice | S |
| 5.2 | Reply-time bar | Estimated reply time split into end-of-speech, hearing, thinking, speaking | | S |
| 5.3 | "Make it faster" | Points at the biggest part, offers real knobs (shorter silence wait, streaming, faster model, shorter replies, filler during lookups) | By voice | S |
| 5.4 | Cost per minute | Estimated ₹/min for the stack | | C |
| 5.5 | Real measured reply time | Every Voice test turn is timed for real (end of speech, hearing, thinking, speaking) | | M |

## 6. Export and keep

| # | Feature | What it does | Wispr | P |
|---|---|---|---|---|
| 6.1 | Export | Download the bot as JSON + system prompt; ready-to-paste formats for Pipecat, Vapi, Retell | | M (JSON + prompt), S (platform formats) |
| 6.2 | My bots | Saved in the browser (no sign-in); open, duplicate, delete | | M |
| 6.3 | Share link | Read-only link to a bot blueprint | | C |

## 7. For judges and the submission

| # | Feature | What it does | P |
|---|---|---|---|
| 7.1 | Sample mode | Opens with a finished sample (sales bot for Wispr Flow, Telugu/Hindi/English) and a rehearsal with a red rule, so a judge sees everything in 30 seconds | M |
| 7.2 | AI-off fallback | If the free AI quota runs out, sample bots and a saved rehearsal still work, labelled honestly | M |
| 7.3 | Proof page | Real result: my bots, time from brief to a tested bot (before vs after), rule breaks caught | M |
| 7.4 | "How Wispr is used" strip | Shows the three places Wispr works: brief, rehearse, fix | S |

## Behind the scenes (needed, not visible features)

- Free AI model: Groq or OpenRouter free models, behind a small server-side proxy so keys never reach the browser (Vercel free).
- The model returns structured JSON (bot spec, flow, rules), checked before drawing.
- Rule checking in rehearsal: the model's reply is checked against the rules by a second, cheap model call plus simple keyword rules.
- Everything stored in the browser; no accounts; no real phone calls.

## Later (after the hackathon, product ideas)

Real phone numbers and scheduled calls (e.g. the 10 am daily brief), deploy straight to Vapi/Retell/Pipecat, team workspaces, analytics on real calls, voice cloning, more languages, Mac app.
