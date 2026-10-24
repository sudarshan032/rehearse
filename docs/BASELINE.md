# Base kit: what the best entries have, and what we build

Built from what the top entries did in Graph Hacks (`graph_hacks/docs/records/competitors/COMPETITORS.md`) and the
No Hands entries seen so far (COMPETITION.md). Only one Builders project wins, so "typical" is not enough.

**Level A = must exist by the end of day 1 after the idea is chosen (skeleton, can be ugly).**
**Level B = must exist before feature freeze.** **Level C = the edge, if time allows, planned from day 1.**

## 1. Judges can try it (25%)

| Item | Who did it | Level |
|---|---|---|
| Public live link, no sign-in, no key, no cold start | Sayso, ShipLog, SayPDF, Debrief; Graph Hacks: 47 demos failed a single check | A |
| Sample data on the first screen + a "For judges" path of 3–5 clicks | Sayso ("For judges" section), official sample | A |
| Works by typing too (judges may not have Wispr) | Sayso, VoiceArchitect ("Type it for me") | A |
| Works with AI off: rule-based or cached result, labelled honestly | Debrief, ShipLog, FlowInsights, Change Guardian | B |
| Reset / own copy per visitor so judges can't break it | ShipLog (workspace per browser), Change Guardian (reset) | B |
| Phone width works | Change Guardian, Déjà Vu | B |

## 2. Proof it solves a real problem (30%)

| Item | Who did it | Level |
|---|---|---|
| Problem in my own words, with how often and what it costs | ShipLog, Chalk | A |
| Real result on my own material with a measured before/after number, method written down | Official sample ("14 real calls"), No Repro (3/3) | B |
| Usage log inside the product ("Proof" page: sessions, minutes saved) | Sayso | B |
| Small evaluation against a simple baseline, reporting where it loses | Debrief (34 sessions vs diff-only); Graph Hacks top 5 all had one | C |
| One command that re-checks every number in the README | Faultline `make judge-check`, Detour `pnpm judge` | C |

## 3. Trust in the output

| Item | Who did it | Level |
|---|---|---|
| Every output shows the words/evidence it came from | ShipLog ("exact words it came from"), Debrief (claims checked against code) | B |
| Refuses to guess when evidence is missing | ShipLog ("That isn't in your log yet") | B |
| Tests for the core logic, run in CI | Graph Hacks top entries (Faultline ~194 test files) | B |

## 4. Wispr used meaningfully (30%)

| Item | Who did it | Level |
|---|---|---|
| One input made for speaking; release the key and it runs | SayPDF ("the command runs the moment the text lands"), Sayso | A |
| "Why voice isn't a gimmick" in 2 lines | Chalk | B |
| Indian-language / Hinglish input works | Debrief, FlowInsights, VoiceArchitect | C |
| Reads from Wispr itself (Scratchpad/Notetaker over Wispr's MCP) | Scar Tissue, VoiceArchitect, SpecFlow (check it is free first) | C |
| Daily voice log + usage card in README and video | — (rare) | A (log), B (card) |

## 5. Packaging: real software people can use

| Item | Who did it | Level |
|---|---|---|
| Installable or callable beyond the website: CLI (`npm i -g`), MCP endpoint, GitHub App, browser extension, desktop build | Debrief (npm CLI + git hook), Scar Tissue (MCP), No Repro (GitHub App), FlowMesh (.exe/.dmg); my Graph Hacks MCP was never packaged | C (pick one that fits the idea, decide on day 1) |

## 6. Presentation (15% + first impression)

| Item | Who did it | Level |
|---|---|---|
| README ≤ 150 lines, proof first (README_TEMPLATE.md) | Stare (Graph Hacks) | B |
| One clean design system, light/dark, consistent | Many Graph Hacks top entries | B (one pass) |
| Video ≤ 1:55 with captions, scripted beats | No Repro has one; only 1 of ~28 so far | B |
| Video recorded by script from the real app (repeatable takes) | Sayso (`npm run record:video`) | C |
| Polished motion graphics in the video (title cards, zooms, callouts) made with code | Siddhu saw these in Graph Hacks. Free options: Remotion (free for individuals), Playwright screen capture + ffmpeg. "HyperFrames" (named by Siddhu): to check what it is and whether it is free | C |
| dev.to blog with code, a "what went wrong" part, and hackathon tags | Graph Hacks top blogs (Bus Factor, Diktiax, Detour) | C |
| LinkedIn posts showing a real workflow with a clip | — (rare) | B |

## Day-1 rule

Once the idea is chosen, the first day must produce all **Level A** items on a live link, and a one-line decision for each
**Level C** item: yes (and when) or no. No Level C work starts before Level B is done.
