# Rehearse: build spec (v1, 24 Oct 2026)

**One line:** Talk your voice bot into shape, then call it before your customers do.
Build, rehearse and fix a voice agent just by speaking, in Telugu, Hindi or English, and watch it work.

**Track:** Builders. **Deadline:** Sat 31 Oct 2026, 11:59 pm IST. **We submit:** Fri 30 Oct. **No edits after submitting.**
**Feature list:** `docs/REHEARSE_FEATURES.md` (M/S/C priorities). **Positioning:** `docs/POSITIONING.md`. **Mock:** `prototype/index.html` (http://localhost:8768).

---

## 1. Who it's for and the real problem

- **User:** people who build voice bots for Indian businesses (me at SIIMA), and owners/ops people who know how the call should go but don't write prompts.
- **Problem:** voice bots are built by typing prompts and clicking through builders (Voiceflow, Vapi, Retell, Synthflow, Bolna, Sarvam Samvaad). The person who knows the call explains it by talking, often in Telugu/Hindi + English. Someone translates that into prompts and boxes, then tests with real phone calls. Slow, and rule breaks ("bot promised a refund") are found by customers.
- **Our answer:** one box you talk into. Describe → it asks questions → it builds the bot (flow, rules, knowledge, prompt, stack) → rehearse a call by voice → broken rule turns red → point and say the fix → real voice test → export.
- **Real result to report:** time from brief to a tested bot (my SIIMA manual way vs Rehearse), rule breaks caught before a real call, measured reply time.

## 2. Wispr Flow's role (be honest, show it)

Wispr Flow is **how you build**: (1) the brief, (2) playing the caller in Rehearse mode, (3) the fixes ("point and speak"). Voice-bot logic with branches and Indian-language rules is easiest to explain by talking; Wispr turns messy mixed-language speech into clean text. The bot's own ears/voice in Voice test are STT/TTS providers, not Wispr. Every box also accepts typing, so judges without Wispr can try it.

## 3. Pages and screens

| Route | Screen | Must-have content |
|---|---|---|
| `/` | **Describe** | Headline "What voice bot do you want to build?"; one big text box (hold fn hint); 3 starting points (Sales, Support, Daily brief) that fill a sample brief; "Build it"; link "See a finished sample" |
| `/b/[id]/interview` | **Interview** | Left: 3–6 questions, each answered in a box (voice/typing), "Build now" / "Ask me more". Right: live "What I understood" panel (goal, callers, languages, knowledge, never/always rules, tools) |
| `/b/[id]` | **Bot** (blueprint), tabs: | Header: bot name, type, languages, version, Export button |
| | Flow | Canvas (React Flow): steps + branches; selected step shows what the bot says; voice edit box ("point and speak"); changed parts glow |
| | Rules | Never/always list with source ("from your answer to Q3"), suggested rules (keep/remove) |
| | Knowledge | Product facts, plans, FAQs; paste text to add |
| | Prompt | The compiled system prompt (read + edit; editing re-syncs flow/rules) |
| | Stack & speed | Hears / thinks / speaks cards; reply-time bar (estimate from catalog, real numbers after a Voice test); "make it faster" knobs; voice picker; "bring your own key" for other providers |
| | Rehearse | Text call: you speak as the customer (Wispr), bot replies (LLM), flow path lights up, broken rule → red bubble + red step + "say the fix"; caller personas; replay turn after fix; call report |
| | Voice test | Real call in the browser: hold-to-talk button; STT → LLM → TTS; bot speaks; per-turn timing bar (end of speech / hearing / thinking / speaking); daily cap shown |
| `/bots` | **My bots** | Cards from local storage; open, duplicate, delete; sample bots marked |
| `/proof` | **Proof** | My real numbers (dated), how measured, usage card image, "built by voice" note |
| dialog | **Keys** | Add your own provider keys (stored in the browser only) to unlock other voices/models |

**Sample mode:** a finished "Wispr Pro Sales Bot" (Telugu/Hindi/English) with a saved rehearsal that hits a red rule, and pre-generated audio for its Voice test lines. Opens from `/` and from the README. Costs nothing per view.

## 4. Architecture

- **App:** Next.js (App Router) + TypeScript + Tailwind, deployed on **Vercel Hobby** (free). One app, one URL. Route handlers are the backend (keys stay server-side).
- **Flow canvas:** React Flow (`@xyflow/react`, MIT) with auto layout (dagre/elkjs).
- **State:** bots and versions in the browser (localStorage / IndexedDB). No accounts, no database.
- **LLM:** Groq free tier (primary; JSON mode / structured output), OpenRouter free models (fallback). Model names are config, not code.
- **STT (Voice test):** Deepgram nova-3 (`language=multi`, free credits) via a server route (prerecorded request per turn; hold-to-talk). Murf STT as fallback.
- **TTS (Voice test):** **Murf Falcon 2.1** (free $10/month, no card; $0.01 per 1,000 characters). Voices: Telugu (Pooja), Hindi (Anisha, `hi-IN` handles Hinglish when English words stay in Latin script), English (Indian). Fallback: Gemini TTS free tier (if key added). Other providers via "bring your own key".
- **Telugu typing (S):** port `space/telugu-onnx/web` (in-browser IndicXlit, ~15 MB, lazy-loaded only when the user turns it on).
- **Settings to reuse from voice-platform knowledge (not code):** Murf `hi-IN` for Hinglish (not `hi-LATN`), keep-alive HTTP clients, stream the first sentence, short silence wait, filler during slow lookups.

### API routes

| Route | In | Out | Calls |
|---|---|---|---|
| `POST /api/interview` | brief text | bot type + 3–6 questions + first "understood" draft | LLM ×1 |
| `POST /api/blueprint` | brief + answers | full Bot JSON (below) | LLM ×1 |
| `POST /api/edit` | bot + target (step/rule/turn/prompt) + spoken instruction | JSON patch + one-line summary | LLM ×1 |
| `POST /api/turn` | bot + call history + caller text | `{reply, step_id, ended}` | LLM ×1 (streamed) |
| `POST /api/check` | rules + reply | `{broken:[rule_id], why}` | keyword rules first, LLM ×1 only if unsure |
| `POST /api/stt` | audio (webm) | text + ms | Deepgram |
| `POST /api/tts` | text + voice | audio stream + ms to first byte | Murf |

All routes: input size limits, per-IP daily caps, clear error JSON, no logging of keys or user audio.

### Bot JSON (single source of truth)

```json
{
  "id": "…", "name": "Wispr Pro Sales Bot", "type": "sales|support|personal|other", "version": 3,
  "goal": "…", "callers": "…", "languages": ["te","hi","en"], "follow_caller_language": true,
  "persona": {"tone": "warm, short sentences", "voice": {"provider":"murf","id":"…","lang":"te-IN"}},
  "knowledge": [{"id":"k1","text":"…"}],
  "rules": [{"id":"r1","kind":"never","text":"Promise a refund","source":"answer:q3"}],
  "tools": [{"id":"callback","enabled":true}],
  "flow": {"steps":[{"id":"greet","label":"Greet + language","says":"…"}],
          "links":[{"from":"greet","to":"ask","when":"always"}]},
  "stack": {"stt":"deepgram:nova-3","llm":"groq:<model>","tts":"murf:falcon-2.1"},
  "prompt": "compiled system prompt (generated from the fields above)"
}
```

The bot's runtime prompt is **compiled** from these fields (never hand-maintained separately); editing the Prompt tab is parsed back into fields.

## 5. Prompts (the real work)

1. **Interview prompt:** classify bot type; ask only what's missing for that type (sales: product, plans, offer, objections, never-promise; support: issues, policies, handover; personal: sources, time, format); max 6 questions; plain language; reply in the brief's language.
2. **Blueprint prompt:** produce Bot JSON matching the schema; 5–9 steps; every rule traceable to an answer (`source`); suggest 1–3 extra rules marked `suggested`.
3. **Edit prompt:** given the target and instruction, return a minimal JSON patch; never touch unrelated parts; return a one-line human summary.
4. **Runtime (bot) prompt:** persona + languages + knowledge + rules + flow; must answer in the caller's language; short spoken sentences; return the current `step_id`.
5. **Rule-check prompt:** strict yes/no per rule with a quote of the breaking words.

Validate every LLM JSON with a schema (zod); on failure retry once, then show a friendly error.

## 6. Free-tier and credit rules (strict)

- **No spending.** Free tiers and free credits only: Groq, OpenRouter free, Deepgram free credits, Murf $10/month, Vercel Hobby. No card anywhere.
- **Protect Murf's $10:** no test loops; Voice test has a per-day cap (e.g. 40 TTS replies/day site-wide) and max 300 characters per reply; cache audio for repeated lines; sample mode uses pre-generated audio files.
- **No experiments or benchmarks.** Settings come from the voice-platform and avatar tests already done (see `docs/REPORT.md` and this file). Plug and play.
- **Bring your own key** for anything else (ElevenLabs, Cartesia, Sarvam, Gemini): keys stay in the user's browser and are sent only with that user's own requests.
- **AI-off fallback:** if a quota is hit, sample bot + saved rehearsal still work, with an honest label.

## 7. Out of scope (say no)

Real phone numbers and scheduled calls, deploying to Vapi/Retell/Pipecat (export only), accounts/teams, analytics on real calls, voice cloning, more than 3 languages, a Mac app, realtime streaming STT with barge-in.

## 8. Acceptance checklist (rubric)

- **Real problem (30%):** README + video open with the SIIMA story; Proof page shows my measured before/after.
- **Wispr meaningful (30%):** video shows Wispr in brief, rehearse and fix; usage card; `docs/voice-log.md` daily.
- **Works (25%):** public Vercel link, no sign-in, sample mode works with AI off, typing works without Wispr, mobile view OK.
- **Demo (15%):** ≤ 1:55 video following `docs/POSITIONING.md` hero demo; product on screen by 0:15.
- Repo private until 30 Oct, then public; README ≤ 150 lines; AI assistance disclosed in one section; no secrets in git.
