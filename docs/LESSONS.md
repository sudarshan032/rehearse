# Lessons from Graph Hacks (15 to 18 Oct 2026)

My entry: **Change Guardian** (repo `northwind-drift-agent`). In my own competitor review it scored **65/80,
joint 8th of 74 Track 1 entries sampled** (likely 10th to 20th in the full field).
Sources (read only): `graph_hacks/docs/records/competitors/COMPETITORS.md`, `docs/records/VIDEO_REVIEW.md`,
`docs/records/PROGRESS.md`, `docs/records/DECISIONS.md`, `docs/specs/`, `README.md`.

## Part 1. What the top entries did that I didn't

| What they did | Example from the field | What I did |
|---|---|---|
| **Real data** | BankWeave: public IBM AML benchmark. Detour: real NYC subway data. ChainBreaker: 1,129 real CNCF repos. Keystone: FalkorDB's own GitHub history. | Synthetic hospital data. Carefully built, but still fiction (data score 7 vs their 9). |
| **Honest proof against a baseline** | Faultline, Stare, Keystone: held-out tests against "no graph" or "LLM only" baselines, and they report where they lose. | No baseline without the graph. Nothing showed the graph made the agent better. |
| **Short README that leads with proof** | Stare: "concise and leads with proof". | 908 lines, full of internal codes (D1–D14, IRE, DECISIONS #93), a leftover "Draft written…" comment. |
| **A judge can re-check the claims** | Faultline `make judge-check`, Detour `pnpm judge`. | Claims checked by me, not by a command a judge can run. |
| **A clear short video** | Most top entries had a short video linked in the README. | First cut 15:34, final cut 8:59. The plan said 2 minutes. |
| **One name** | Product = repo name. | Product "Change Guardian", repo "northwind-drift-agent". |

## Part 2. My process mistakes, and the rule for this hackathon

Each row: what happened → the rule we follow now.

### 1. Infrastructure before the core
- **What happened:** the first day went into the data generator, loader, clean-room runs and research (PROGRESS M1–M8), then a database benchmark with 4 sizes up to 3.47M nodes. The agent itself (AGENT_V2, "the Change Guardian") only came together late on 16 Oct and was evaluated on 17 Oct.
- **Rule:** **Day 1 = the core loop, live on a public URL, end to end, ugly is fine.** Speak → result on screen → saved. No database, auth, benchmark, design system or extra pages until the loop works and I have used it on real material.

### 2. Re-reading the brief late
- **What happened:** the judging criteria ("agent effectiveness", convincing end-to-end result) asked for proof that the graph helps. I never built the baseline. The video review had to remind me to "check the official submission limit".
- **Rule:** **re-read RULES.md and RUBRIC.md at the start of every day** (it is in CLAUDE.md). Every feature must map to one rubric line. If it maps to none, it waits.

### 3. Late redesigns
- **What happened:** a UI redesign on 16 Oct, then REDESIGN_SPEC and DESIGN_FINAL_SPEC both on 18 Oct, the deadline day, plus a self-healing demo graph the same day.
- **Rule:** **one design pass only, on 27 Oct. Feature freeze 28 Oct, 10 pm IST.** After the freeze: only bug fixes, copy fixes, video and README.

### 4. A rambling demo that never showed the product running
- **What happened:** the first take was 15:34. The agent was never run on camera ("Ask the agent to review" never pressed), Approve was never clicked, the headline numbers (4 vs 107 components, 51 hospitals) were never said, terms were explained wrongly three times, and there were "one second" pauses.
- **Rule:** **video ≤ 2:00, target 1:50, scripted beat by beat (DEMO.md).** The product runs live on screen within 20 s. The real number is said aloud. Record in short takes and cut, never one long take.

### 5. An unfair benchmark found late
- **What happened:** the FalkorDB client parsed replies in pure Python while PostgreSQL used its C driver. This was found after the results were published (DECISIONS #92, hiredis), and the numbers had to be re-measured and relabelled.
- **Rule:** **no benchmark unless it is needed for the rubric.** For this challenge the only number that matters is my real before/after on my own work. Measure "before" first (time it on 24 Oct, before using the tool), with the same task and the same stopwatch method, and write down how it was measured.

### 6. Synthetic data
- **What happened:** very careful fake data still scored below real public data.
- **Rule:** **real material only for the result** (my own predictions, interviews, notes, emails from 24 to 29 Oct). The public demo uses safe sample data that is clearly labelled as sample. Private material never goes into the repo; only counts and timings do.

### 7. Too many tracks
- **What happened:** I claimed all three tracks. The Track 3 case was thin and diluted the Track 1 story.
- **Rule:** **one project, one track: Builders.** The README says the track once.

### 8. An overlong README
- **What happened:** 908 lines. The proof was buried under internals.
- **Rule:** **README ≤ 150 lines** (README_TEMPLATE.md). First screen: what it is, who it is for, proof (real result + usage card), try-it link, video. Internals go to `docs/`.

### 9. Files dated before the start
- **What happened:** `docs/records/drift-agent_checkpoint_20261012.log` (dated before the 15 Oct start) and `CLAUDE.md` were committed. A judge checking the new-work rule could question it.
- **Rule:** **no file in the repo is dated or named before 16 Oct**, and planning files that are not part of the product (this `docs/` research, `CLAUDE.md`) are reviewed before the repo goes public. Decide on 28 Oct what stays public. Never copy files from `graph_hacks/`.

### 10. Almost no social posts
- **What happened:** the blog had 0 reactions and 1 comment, the hackathon tags were missing, and there were almost no posts.
- **Rule:** **four posts on fixed dates (25, 27, 29, 30 Oct), each showing a real workflow with a screen clip** (SOCIAL.md). Always use #NoHandsChallenge and tag WeMakeDevs and Wispr Flow. Link each post in the weekly check-in.

### 11. Small repo hygiene slips
- **What happened:** a leftover "Draft written from the repository's records…" HTML comment, no homepage or topics on the repo, an uncited "Gartner" claim in the blog and video.
- **Rule:** no draft comments, no unsourced claims, set the repo homepage + topics on day 1, AI-assistant use disclosed in one short README section.

## Part 3. Siddhu's own view (24 Oct)

- **The biggest mistake was the analysis, not only the process.** Choosing the CMDB problem, and the solutions built around it, was the weak point. Process fixes don't help if the problem is wrong.
  - **Rule:** spend real effort on choosing the idea, against the official rubric and the live competition (COMPETITION.md), *before* any code. Score ideas honestly, and kill weak ones early.
- **Rivals went further on finish.** Some packaged their work as real software people can install or call, made polished videos (motion graphics / AI-made video) and had very good design. Mine had an unpackaged MCP endpoint on the website and a plain face-cam video.
  - **Rule:** decide the "base kit" (docs/BASELINE.md) as soon as the idea is chosen, and plan the packaging, video style and design from day 1, not on the last day.
- **Goal:** win. That means good analysis, real innovation, and finishing strong.

## Part 4. What went well (keep doing it)

- Clear end-to-end story with one headline example and one control case.
- Honest notes where the other side wins (the PostgreSQL result).
- A demo that always works: cached answers, reset, fallback text when the AI is not available.
- Every claim audited against the code before submitting.

Keep these, but in a much smaller product.
