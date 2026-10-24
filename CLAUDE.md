# Rehearse — No Hands: The Wispr Challenge (project rules)

**Product (decided 24 Oct 2026, do not re-open):** Rehearse — build, rehearse and fix a voice agent just by speaking
(Telugu/Hindi/English): describe → interview → blueprint (flow, rules, knowledge, prompt, stack) → rehearse by voice
(path lights up, broken rule turns red) → point-and-speak fix → real voice test (Deepgram → Groq → Murf) → export.
**Read first every session:** `docs/SPEC.md`, `docs/PLAN.md` (today's row), `docs/REHEARSE_FEATURES.md`, then `docs/RULES.md`, `docs/RUBRIC.md`.
History of how we got here: `docs/IDEAS.md`, `docs/DECISION.md`, `docs/REPORT.md`, `docs/POSITIONING.md`.

## Build rules (from Siddhu, 24 Oct)
- Build fast; no loops; no re-opening the idea. Details change while building.
- **No testing/benchmark spend.** STT/LLM/TTS settings come from Siddhu's earlier SIIMA tests (summarised in docs/SPEC.md §4). Plug and play.
- **Murf has only $10/month free: never waste it** (no test loops; caps; cached audio). Free tiers only, no card, ever.
- **One local URL only**; stop old servers before starting new ones.
- SIIMA code is under NDA: use the *knowledge* (settings, lessons), never copy SIIMA code or data. All code is new, written in the hackathon window.
- Keys live in `.env` (git-ignored); never print them.


Owner: Sudarshan ("Siddhu"), early-career full-stack AI engineer, Hyderabad. Part-time AI engineer at Anju Siima Technologies (SIIMA): voice-calling platform, talking-avatar project. Job hunting. Builds by directing Claude Code by voice (Wispr Flow) and reviews. (Not NautiCAI: that was wrong context in the first brief.)
Mac + phone only. Deadline: **Sat 31 Oct 2026, 11:59 pm IST** (moved from 30 Oct on 23 Oct). **We submit on Fri 30 Oct; Sat 31 Oct is the spare day.** **One submission, no editing after it.**

Read at the start of every session: `docs/RULES.md`, `docs/RUBRIC.md`, `docs/PLAN.md` (today's row), `docs/LESSONS.md`.

## Hard rules

- Never modify, move or delete anything outside this folder.
- `/Users/siddh/Downloads/graph_hacks/` is **read-only**. Never copy files from it into this repo.
- Never touch `~/Movies` except to read or copy from it.
- Wispr Flow's local data (`~/Library/Application Support/Wispr Flow/`) is read-only: read a copy only, never commit it.
- Never delete data, tokens, credentials or accounts.
- Never print or commit secrets. Keys live in `.env` (git-ignored). Never paste a key into chat, logs or docs.
- **Free tiers only.** Never add billing, a card or a paid plan anywhere. If a step needs payment, stop and ask.
- Don't ask Siddhu to report what you can check yourself: read logs, files, git state, the live site.
- Write in plain, simple English. Siddhu is a fresher. Short sentences, no jargon.

## Token and time budget

- Siddhu has about 3 to 4 hours of Claude Code per day and hits usage limits. Don't waste tokens.
- Read only what the task needs (targeted `grep`, `head`, line ranges), never whole big files or folders "to be safe".
- No re-reading files already in context, no long explanations, no repeated summaries.
- Anything that takes more than about 2 minutes (installs, builds, deploys, video renders, big fetches) runs in the background. Don't poll it; read the result once when it finishes.
- Use subagents only for truly parallel or large read-only searches.

## One project, one track

- **Builders track.** One project. Same name for the repo, the product, the site header, the video and the posts.

## Acceptance criteria (the rubric)

A change is only worth doing if it helps one of these. Full checklist: `docs/RUBRIC.md`.

| Weight | Criterion | Must be true at submission |
|---|---|---|
| 30% | Real problem in my work | One-sentence problem + how often; a clear user (me); a real result with a number from my own material, 24–29 Oct; a dated usage log |
| 30% | Wispr used meaningfully | Main input made for speaking; video shows Flow live; usage card + `docs/voice-log.md`; README says why voice beats typing |
| 25% | Does it work | Public live link, no sign-in, sample data on the first screen, works by typing too, cached/offline mode when AI is off |
| 15% | Demo clear | Video ≤ 2:00 (target 1:50), follows `docs/DEMO.md`, product running by 0:15 |

## Working rules (from Graph Hacks, see docs/LESSONS.md)

1. **Proof before polish.** Core loop live on day 1 (24 Oct). Real use from day 2. No design work before real use.
2. **Core before infrastructure.** No database server, auth, benchmark or extra pages unless the core loop needs it.
3. **Re-read the brief daily.** Every feature maps to one rubric line, or it waits.
4. **One design pass** (27 Oct). **Feature freeze 28 Oct, 10 pm IST.** After that: bug fixes, copy, README, video only.
5. **Real data for the result.** Sample data only for the public demo, labelled as sample. Private material never enters the repo; only counts and timings.
6. **Measure "before" first**, same task and same method as "after". Write down how it was measured.
7. **No unfair or unneeded benchmarks.**
8. **Short README:** ≤ 150 lines, first screen per `docs/README_TEMPLATE.md`.
9. **Short video:** ≤ 2:00, short takes, no slides, no waiting on screen.
10. **LinkedIn posts + one dev.to blog** (`docs/SOCIAL.md`, dates in PLAN.md), each showing a real workflow. No X.
11. Rule-based first, AI second. Any AI step has a cached result and an honest "AI off" label.
12. Claims in README, site and video must match the code and `docs/results.md`. No unsourced claims.

## Repo hygiene

- No draft or TODO comments, no "written by" notes, no placeholder text left in the shipped repo.
- No files dated or named before 16 Oct 2026. Never copy old files in.
- Repo homepage and topics set on day 1. Repo name = product name.
- `.env`, Wispr data, raw videos and private material are git-ignored.
- AI-assistant use is **disclosed in one short README section** ("How it was built"). This is Siddhu's explicit request for this project.
  Everywhere else the global rule holds: no AI attribution in commits, trailers, PR text, code comments or branch names.
- **Repo stays private until submission day (30 Oct)**, then made public. Before that: decide which planning docs stay public; check `git log -p` for secrets.
- Commit messages are short and plain, dictated where possible.

## Stack defaults (free)

- Next.js (App Router) + TypeScript + Tailwind + React Flow on Vercel Hobby; route handlers keep keys server-side.
- LLM: Groq free (primary), OpenRouter free (fallback). STT: Deepgram nova-3 multi. TTS: Murf Falcon 2.1 (Telugu Pooja, Hindi Anisha hi-IN, Indian English).
- Browser local storage for bots. No sign-in, no database.
