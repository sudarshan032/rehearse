# Competition: No Hands entries found (23 Oct 2026)

## How this was gathered (read-only)

- **GitHub search API** (signed in as me, read-only; no star, fork, comment or contact): 11 repo searches
  (`"Wispr Challenge"`, `NoHandsChallenge`, `"no hands" wispr`, `wemakedevs wispr`, `wispr hackathon`, each also with `in:readme`,
  all `pushed:>=2026-10-15`) and 4 code searches (`"NoHandsChallenge"`, `"Wispr Challenge"`, `"No Hands" "Wispr Flow"`,
  `wemakedevs "wispr flow"`). 106 unique repos; 80 READMEs read after removing obvious noise (awesome lists, star lists).
  Kept: created on or after 14 Oct and mentioning Wispr.
- **dev.to API:** tags `nohandschallenge`, `wispr`, `wisprflow`, `wemakedevs`, `nohands`, `wisprchallenge`, `voice`.
  **0 posts about this challenge** (the `wemakedevs` tag is all Graph Hacks posts; `wisprflow` has one July post).
- **Official pages:** leaderboard (usage view) and the daily-draw page.
- **Not used:** LinkedIn, X, any signed-in site.

**Limits.** GitHub only finds Builders entries that host code and mention Wispr. No-Code entries (Lovable, GPTs, Zapier)
are mostly invisible here. Many people will submit in the last days. So this is a sample of about 28 entries, not the field.
Live links were **not** opened (one link per README was only read from the text), so "live link" means "the README gives one".

## Signals from official pages

- **Daily draw winners so far:** SayPDF (@gracey, 23 Oct) and SpecFlow (@leena, 22 Oct). So submissions are already in.
- **Usage leaderboard top 10 (23 Oct):** Saiprakash Kulkarni 2,91,673 · Rakesh Behera 2,43,544 · Abinivesh M 2,25,202 (BuildFlow AI) ·
  Prashant Thakur 1,33,597 (Debrief) · Rupesh Kumar 1,17,083 · Ayush Agarwal 80,928 (docs-drift) · Arpan Kumar 63,710 ·
  Ankith M 52,635 (ShipLog) · Jaya Surya 44,558 · Vilakshan Pal 44,422.
- **Known strong builders:** Prashant Thakur (Debrief) made **Faultline**, 69/80, 3rd in my Graph Hacks Track 1 review.
  Ankith M (ShipLog) made **DawaiGraph** (62). Nilesh (OfferCheck) made MetroMarg (50). Expect polished, well-evidenced work from them.

## Entries table

"Resembles" = the closest official idea (ideas page or blog). Real data = the README shows the author's own or public real material.

| # | Name | Link | One-line idea | Resembles official example | Real data | Live link | Video |
|---|---|---|---|---|---|---|---|
| 1 | Debrief | [Prashant-thakur77/Debrief](https://github.com/Prashant-thakur77/Debrief) | Speak 60 s at end of day → commits, PR text, ticket comments, standup, each sentence checked against the code | AI eng "Meeting notes into tickets"; blog "standup summary bot" | Yes: public repos, 34-session eval vs a diff-only baseline | Yes | Not seen |
| 2 | ShipLog | [Ankith-m1006/shiplog](https://github.com/Ankith-m1006/shiplog) | Talk through your work → log, deadlines, follow-ups, live PR state; refuses to guess | Standup / weekly report | Yes: own tracker of 10 hackathons and PRs | Yes (Cloud Run) | Not seen |
| 3 | Sayso | [Utkarsh2730/sayso](https://github.com/Utkarsh2730/sayso) | 30 s spoken call recap → CRM record, follow-up email, pipeline Q&A | **Sales example + sample submission (near copy)** | Partly: "Proof" page tracks real use | Yes | 30 s tour in repo |
| 4 | No Repro | [rushibhosalepro/no-repro](https://github.com/rushibhosalepro/no-repro) | GitHub App: vague bug report → reproduced bug, Sentry error, line, commit | none close | Yes: one real report reproduced 3/3 | Yes | **Yes (YouTube)** |
| 5 | SayPDF | [GraceyDugar/voice-pdf-editor](https://github.com/GraceyDugar/voice-pdf-editor) | Edit a PDF by saying it; runs fully in the browser | none | Sample PDFs | Yes | No · **won daily draw** |
| 6 | SpecFlow | [varmaleena/SpecFlow](https://github.com/varmaleena/SpecFlow) | Spoken brief → architecture, spec, sprint tickets with review gates | PM "PRD writer" | No | Yes | No · **won daily draw** |
| 7 | BuildFlow AI | [abinivesh-m/buildflow-ai](https://github.com/abinivesh-m/buildflow-ai) | Voice intake → requirements traceability, Mermaid, release checks | PM "PRD writer" | No | Yes | No |
| 8 | Scar Tissue | [j4yop/scar-tissue](https://github.com/j4yop/scar-tissue) | Dictate lessons your coding agent keeps forgetting → memory via MCP | AI eng "Q&A bot for your own docs" | Not shown | Yes | "coming" |
| 9 | Receipts | [jars-demo/wispr-demo](https://github.com/jars-demo/wispr-demo) | Spoken request → receipt for coding agent, then check the agent's work against it | coding-agent prompts | No | Yes (homepage) | No |
| 10 | Motion Brief | [Fahad-Dezloper/MotionBrief](https://github.com/Fahad-Dezloper/MotionBrief) | Narrate an animation frame by frame → prompt for coding agent | coding-agent prompts | Samples | No | No |
| 11 | PR-Whisperer | [KrishnaG-101/PR-Whisperer](https://github.com/KrishnaG-101/PR-Whisperer) | Spoken code review → line-pinned comments + fix pack for agents | AI eng "Code review assistant" | No | No | No |
| 12 | ReviewAloud | [priyansh-narang2308/reviewaloud](https://github.com/priyansh-narang2308/reviewaloud) | Voice PR review, then verify the agent's fix landed | "Code review assistant" | Sandbox repo | No | No (in development) |
| 13 | Déjà Vu | [aneek22112007-tech/deja-vu](https://github.com/aneek22112007-tech/deja-vu) | Mutter while debugging → recall how you fixed it before | "Q&A bot for your own docs" | Claim only ("4+ hours a week") | Yes | No |
| 14 | FlowMesh | [HamzaShaikh-source/flowmesh](https://github.com/HamzaShaikh-source/flowmesh) | One spoken sentence → plan you approve → actions with receipts | inbox/agent example | No | Yes (Netlify) | No |
| 15 | Chalk | [KPRAHUL1/Chalk](https://github.com/KPRAHUL1/Chalk) | Describe a system aloud → architecture diagram that rewires as you correct yourself | none | Yes: own Next.js storefront | Yes (homepage) | No |
| 16 | VoiceArchitect | [Dakshhhhh-ops/no-hands](https://github.com/Dakshhhhh-ops/no-hands) | Voice changes keep a diagram in sync with docker-compose | none | No | Placeholder ("LIVE_URL") | No |
| 17 | NoHandsDev | [swaritn13/nohandsdev](https://github.com/swaritn13/nohandsdev) | Speech → PRD + issues, review comments, changelogs | PRD writer + meeting notes into tickets | No | No | No |
| 18 | SprintPulse AI | [satanic47/sprintpulse-ai](https://github.com/satanic47/sprintpulse-ai) | Standups, PR descriptions, release notes by voice | **"standup summary bot"** (blog) | No | Yes | No |
| 19 | BuildLog | [albin170/buildlog](https://github.com/albin170/buildlog) | Developer work log, tasks, bugs with voice quick-capture | standup / work log | No | Yes (homepage) | No |
| 20 | dictate-docs | [sahilsaeidkhan/dictate-docs](https://github.com/sahilsaeidkhan/dictate-docs) | Dictated notes → commit messages and README sections | "release notes writer" (blog) | No | No | No |
| 21 | docs-drift | [ayushagarwalhere/docs-drift](https://github.com/ayushagarwalhere/docs-drift) | Find docs that no longer match the code, gate it in CI | none | One real case (rich-cli) | No (self-hosted) | Pending |
| 22 | FlowInsights | [awanishkumarmishra2005-eng/flowinsights](https://github.com/awanishkumarmishra2005-eng/flowinsights) | Spoken question about sales data → chart and headline, Hinglish | main page "the report you rebuild every Monday" | Sample CSV | No | No |
| 23 | Deadline Radar | [Kartikey-Kesarwani-2005/Deadline-Radar](https://github.com/Kartikey-Kesarwani-2005/Deadline-Radar) | Speak/paste college assignments → urgency-sorted deadlines | none (deadline tracker) | Samples | Yes | Pending |
| 24 | HackPilot | [priyanshiy1312-ui/hackpilot](https://github.com/priyanshiy1312-ui/hackpilot) | Paste hackathon pages → deadlines, checklist, countdown | deadline tracker | No | No | No |
| 25 | ShipReady AI | [revanth2444-cmyk/shipready-ai](https://github.com/revanth2444-cmyk/shipready-ai) | Hackathon submission readiness score | deadline tracker | No | Yes (Streamlit) | No |
| 26 | DemoReady | [shivam499-pro/DemoReady](https://github.com/shivam499-pro/DemoReady) | CLI that checks a repo is demo-ready | none | No | No (CLI) | No |
| 27 | OfferCheck | [nilesh0199/OfferCheck-WisprFlow-Hackathon-2026](https://github.com/nilesh0199/OfferCheck-WisprFlow-Hackathon-2026) | Check an internship/job offer for scam signs before paying | none (job seekers) | Official advisories cited | Yes | No |
| 28 | (no README) | [Aman071Raj/WeMakeDevs_Project_Wispr_Flow](https://github.com/Aman071Raj/WeMakeDevs_Project_Wispr_Flow), [mohitjeswani01/duck](https://github.com/mohitjeswani01/duck) | unknown | — | — | — | — |

Found but **not entries** (other hackathons or Wispr clones): wispr-local, kotoba, VozFlow, Quicky (dictation apps);
build-a-bot and StutterClear (Nebius × NVIDIA); G2 Meets (LA Hacks); two Cornell Six Sigma repos.

## Crowded themes

| Theme | Entries | Count |
|---|---|---|
| **Developer write-ups** (standup, PR/commit text, work log, docs) | Debrief, ShipLog, SprintPulse, BuildLog, dictate-docs, NoHandsDev, docs-drift | **7** |
| **Coding-agent prompts, memory, review, verification** | Scar Tissue, Receipts, Motion Brief, PR-Whisperer, ReviewAloud, Déjà Vu, FlowMesh | **7** |
| **Specs, PRDs, planning, architecture diagrams** | SpecFlow, BuildFlow AI, NoHandsDev, Chalk, VoiceArchitect | **5** |
| **Deadline / hackathon trackers** | Deadline Radar, HackPilot, ShipReady AI, DemoReady | **4** |
| **Call notes → follow-up email / CRM** | Sayso, plus the official Sales example and the official sample submission | **1 + 2 official** |
| Voice commands for a file or data | SayPDF, FlowInsights | 2 |
| Other | No Repro (bug reports), OfferCheck (job offers) | 2 |

**Top 3 crowded:** developer write-ups (7), coding-agent prompts/memory/review (7), specs/planning/diagrams (5).
"Call → follow-up" has only one GitHub entry, but it is the official sample, so judges will see many copies of it from No-Code entries we cannot search.

## What the strongest entries do well

1. **Debrief:** every generated sentence is checked against the real code; an evaluation on 34 sessions against a simple baseline; a "try it, no sign-in" page with real public stories; Hinglish; a CLI and a git hook. Very strong on all four criteria.
2. **ShipLog:** the problem is stated in the author's own words with real detail ("ten hackathons, open pull requests and reviewers I must not ping twice"). "The model proposes, code decides": every item shows the exact words it came from, and it refuses to guess.
3. **Sayso:** a "For judges" section with 5 numbered clicks, no sign-in, no key, and a "Proof" page that tracks real use (calls logged, minutes saved).
4. **No Repro:** the only entry with a YouTube video already; a real bug reproduced 3 of 3 times; clear "who it's for".
5. **SayPDF / Chalk:** one-line pitch you get instantly; voice is the obvious input ("You talk. It draws."). Chalk has a "Why voice isn't a gimmick" section.

Patterns: most strong entries have a no-sign-in demo with sample data, a deterministic fallback when the AI is off, and they show the source words behind each output.

## Gaps nobody fills yet

1. **Work away from code.** No entry for field or inspection work, maintenance, property, operations. Every entry is software, college or sales.
2. **ML engineer workflows.** No entry for reviewing model predictions, labelling, error analysis or experiment logs, even though "AI engineers" is a listed role.
3. **Speaking while your eyes are busy on something visual** (images, video frames, a site). Only Motion Brief (animations) and Chalk (diagrams) come close.
4. **Job-hunt preparation.** OfferCheck checks offers; nobody helps practise interview answers or tailor applications.
5. **A real before/after number on the author's own work.** Only Debrief (eval) and No Repro (one real case) show measured results. Most READMEs state claims ("saves 40% of the day") without measurement.
6. **Videos.** Only 1 of about 28 entries links a finished video. A clear 1:50 video is an easy edge.
7. **Social proof.** 0 dev.to posts about the challenge. Posts are a cheap way to stand out (and they feed the Social prize).
8. **Short READMEs.** Many are 150 to 300+ lines, some with "TODO (author)" placeholders or rubric scores written into the README.

---

## Update, 24 Oct (second sweep)

**Sources:** GitHub repo search again (5 queries, created since 14 Oct, 108 repos, 75 new since 23 Oct); dev.to API
(0 posts about the challenge); web search for LinkedIn, X, YouTube, Medium and Hashnode posts. **LinkedIn and X posts are
not indexed by search engines**, and we don't open signed-in sites, so the only social item found is WeMakeDevs' own
[launch post on X](https://x.com/WeMakeDevs/status/2111075439632580956). If Siddhu pastes LinkedIn posts he sees, they can be added here.

**Note on the daily draw:** draw winners (SayPDF, SpecFlow) are **picked at random** ("10 projects picked at random"),
not by the judges. They show what is being submitted, not what scores well.

### New entries (mention the challenge)

| Name | Link | One line | Pattern |
|---|---|---|---|
| FormFlow | [Anurag13075/FormFlow-](https://github.com/Anurag13075/FormFlow-) | Browser extension: speak, it fills any form (job portals, Google Forms…) | voice → action |
| DevFlow | [Lakshya-2440/DevFlow](https://github.com/Lakshya-2440/DevFlow) | Speak → terminal commands, git chains, diffs | voice → action (dev) |
| DocPilot | [Chaithanya123123/DocPilot](https://github.com/Chaithanya123123/DocPilot) | Upload a PDF, ask by voice, answers with citations to the page | voice → document |
| Smaran | [oye-durgesh/Smaran](https://github.com/oye-durgesh/Smaran) | Say in Hindi/Hinglish what your parents must remember → reminders, health notes | **Hinglish, family, non-dev** |
| SaySketch | [RajdeepKushwaha5/SaySketch](https://github.com/RajdeepKushwaha5/SaySketch) | Talk a diagram into shape, refine on every pause | voice → action (diagram) |
| Vox PR | [napraveen/wispr-flow-demo](https://github.com/napraveen/wispr-flow-demo) | Dictate PR review thoughts → line-pinned comments | code review (crowded) |
| VoxDeck | [NotADIM2/VoxDeck](https://github.com/NotADIM2/VoxDeck) | Wispr brain-dump → 10-slide pitch deck | voice → document |

### Not entries, but important: people already build **on Wispr's own data**

| Repo | What it does | What it means for us |
|---|---|---|
| [Blackrose-blackhat/MorningContext](https://github.com/Blackrose-blackhat/MorningContext) | macOS menu-bar app: reads yesterday's Claude Code, Codex and **Wispr dictations and meetings**, writes and speaks a morning brief | Wispr-data reading is possible and wanted; close to Flow Ledger |
| [Frozelo/wisprSummary](https://github.com/Frozelo/wisprSummary) | Polls **Wispr's MCP** for finished Notetaker meetings, sends decisions and action items to Telegram | The MCP works for third-party code |
| [abhinavgupta0809/wispr-flow-prototypes](https://github.com/abhinavgupta0809/wispr-flow-prototypes) | Four unofficial Wispr feature prototypes for a **job application to Wispr**: Phrase Repair, Journal Mode, Review Revisions, Voice Skills | "Phrase Repair" (quick corrections) is near Teach Wispr's theme; it is a proposal, not a tool on your own history |
| HemalathaGrandhi/hemalatha_wispr_flow, rahuljtom/wispr-flow-india-growth-study, shivansh-wispr | Growth/analytics studies of Wispr's India gap | Wispr's India growth is a hot topic (people apply to Wispr with it) |
| ~30 Wispr clones (local-flow, mynah, swell, bolo (Hinglish, Linux)…) and fixes (clipboard guard, TeamViewer fix, dark mode) | Not entries | Shows real pain points of Wispr users: privacy, cost, Linux, Hinglish, small bugs |

Other events with Wispr tracks: Wispr Flow Hacker House Goa 2026 (SpeakBoard, Cosmos), Megathon's Wispr "Prompt Roulette",
WeMakeDevs' "Flip the Switch" hackathon ("Code with Wispr" award).

### Patterns now

1. **Voice → action on the thing you're looking at** (SayPDF, SaySketch, FormFlow, DevFlow, SpeakBoard): the spoken text is *executed*, not just written. This is the strongest new pattern, and it is filling up (5+).
2. **Voice → document** (SpecFlow, VoxDeck, DocPilot, NoHandsDev): crowded.
3. **Hinglish / non-dev everyday life** (Smaran): rare, and on-message for Wispr India.
4. **Built on Wispr's own data:** only outside the challenge so far (MorningContext, wisprSummary). **No entry does it yet.**

---

## Social sweep, 24 Oct (LinkedIn, X, YouTube by Siddhu)

Summarised in `docs/REPORT.md` §4 (strongest rivals, what posts show, gaps). Key items: Ankith M (ShipLog) posts daily on X with word counts and a "Wispr bloopers" post (WeMakeDevs → "Vmac dose", FalkorDB → "Falter DB"); Sayso video premieres 25 Oct with chapters; Sunil Sonu (MEMO) Day 1/2/4 posts; Kalaivanan Ramesh: multilingual meetings → English notes; RunNotes (Zeus, X); WeMakeDevs promotes daily-draw winners on LinkedIn. Discord inactive.
