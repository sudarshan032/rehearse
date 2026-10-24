# No Hands: research report (24 Oct 2026)

For: Siddhu (Sudarshan) and friends, to discuss before we pick the final idea.
Status: research done, **idea not decided**, no app code written. Deadline **Sat 31 Oct, 11:59 pm IST**; we submit **Fri 30 Oct**.
Details behind every section are in `docs/` (RULES, RUBRIC, SUBMISSION, LESSONS, COMPETITION, IDEAS, BASELINE).

---

## 1. The challenge in one minute

- **What:** "No Hands: The Wispr Challenge" by WeMakeDevs × Wispr Flow, online, 16–31 Oct 2026, open to anyone in India.
- **Ask:** "fix a real problem in their own work by building a tool for it. The twist is that you have to use voice for the building process."
- **Solo**, **one track** (Builders for developers, No-Code for everyone else), **one project**.
- **Submit (one shot, no editing):** project title, track, demo video link (≤ 2 min), working project link, "About the project" (problem, who it's for, how Wispr was used), Wispr usage card screenshot, feedback on Wispr Flow. There is **no repo field**.
- **Prizes:** ₹1,00,000 each to the **Builders winner**, the **No-Code winner** and **rank 1 on words dictated**. Plus 10 × $100 to random submitted projects (one per day). **Only one Builders project wins money from judging.**
- **Dates:** scores public Wed 4 Nov, questions until Thu 5 Nov, winners Fri 6 Nov.
- **Terms (WeMakeDevs):** no "misrepresenting what you built during the hackathon window"; disqualification possible even after winning.
- The site changed on 23 Oct (deadline 30 → 31 Oct, prize wording, "solo" everywhere). We re-check it daily.

## 2. How projects are judged

| Weight | Official question | What it means for us |
|---|---|---|
| 30% | "Does it solve a real problem in your work?" ("A specific problem, a clear user, and a tool that person would keep using.") | My own weekly problem + a measured before/after on my own material |
| 30% | "Was Wispr used meaningfully?" ("Flow is part of the build and the workflow, and your demo and usage card show it.") | Wispr must be the hero, not just an input box |
| 25% | "Does it work?" ("A live link the judges can open and use.") | No sign-in, sample data, works in one minute |
| 15% | "Is the demo clear?" ("A two-minute video anyone can follow.") | Scripted 1:50 video, product running by 0:15 |

**Judges:** Kunal Kushwaha (Founder, WeMakeDevs), Rohan Kochhar (India Growth, Wispr Flow), Aayush Sharma (COO, WeMakeDevs), Sachin Sharma (CMO, WeMakeDevs). Three of four are founder/growth/marketing people.

**What they really reward (our reading of the whole site):**
1. Voice is the hero ("If you can speak it, you can build it").
2. Everyday, relatable pains (their examples: the Monday spreadsheet report, the same three WhatsApp replies, the CRM nobody updates).
3. Clarity + one real number (their sample entry: "14 real calls", "half an hour → under a minute").
4. A story they would post on their channels (they may feature projects).
5. Wispr's India growth: India is Wispr's fastest-growing market, launched with Hinglish, ~14% of downloads but ~2% of revenue (TechCrunch, May 2026).

## 3. Lessons from our last hackathon (Graph Hacks, 15–18 Oct)

Our entry "Change Guardian" scored about 65/80 in our own review (joint 8th of 74 sampled). What hurt:
- **The idea analysis** (choosing the CMDB problem) was the biggest weakness, not only the process.
- Infrastructure (data generator, benchmark) before the core; late redesigns on the last day; a 15-minute first video (final 9 min) that never showed the product running live; an unfair benchmark found late; synthetic data; claiming all three tracks; a 908-line README; files dated before the start; almost no social posts.
- Rivals finished stronger: real data, honest baselines, packaged software, polished videos and design.

**Rules we now follow:** choose the idea carefully against the rubric and the live field; core loop live on day 1; real use from day 2; one design pass; feature freeze; video ≤ 2:00; README ≤ 150 lines; LinkedIn posts with real workflows; repo private until submission day, all new code.

## 4. The competition (as of 24 Oct)

**Sources:** GitHub search (≈ 180 repos checked over two sweeps), dev.to (0 posts), LinkedIn, X and YouTube searched by Siddhu while signed in (screenshots), WeMakeDevs Discord (inactive), official leaderboard and daily draw.

### Entries seen (about 35)

| Pattern | Examples | Count |
|---|---|---|
| Developer write-ups (standups, PRs, commits, work logs, docs) | Debrief, ShipLog, MergeWhisper, SprintPulse, BuildLog, dictate-docs, NoHandsDev, Vox PR | 8+ |
| Coding-agent prompts / memory / review | MEMO, Scar Tissue, Receipts, Motion Brief, PR-Whisperer, ReviewAloud, Déjà Vu | 7+ |
| Specs, PRDs, diagrams, decks | SpecFlow (daily draw), BuildFlow AI, SaySketch, Chalk, VoxDeck | 6+ |
| Voice → action on the thing you look at | SayPDF (daily draw), DevFlow, FormFlow, SaySketch | 4+ |
| Meetings / multilingual notes | Dictaflow, Kalaivanan's multilingual-meeting tool (Tamil/Hindi/Malayalam/Telugu → English notes) | 2+ |
| Trackers (deadlines, hackathons) | Deadline Radar, HackPilot, ShipReady, DemoReady | 4 |
| Sales call → CRM | Sayso (+ the official sample) | 1 |
| Everyday life / non-dev | Smaran (Hinglish health reminders for parents), learning app with "explain it back" (BizBites idea) | 2 |
| ML / data | RunNotes on X (ML lab notebook from W&B runs), FlowInsights | 2 |

### Strongest rivals
- **Ankith M** (ShipLog): very active on X (several posts a day, word counts "78,000 total"), YouTube video (1:24) done, live app with sample workspace, "the model proposes, code decides". Also made DawaiGraph in Graph Hacks. On the usage top 10.
- **Prashant Thakur** (Debrief): spoken end-of-day debrief → commits/PR/standup, every sentence checked against the code, 34-session evaluation. Made Faultline (3rd in our Graph Hacks review). Usage rank 4.
- **Utkarsh** (Sayso): best "For judges" section; YouTube premiere 25 Oct with chapters (problem 0:00 → dictate 0:13 → record fills 0:29 → fix by voice 0:43 → ask pipeline 1:02 → proof of real use 1:14). A good video template.
- **Sunil Sonu** (MEMO): disciplined build-in-public posts (Day 1, 2, 4), killed his first idea because a free tool already solved it, real numbers ("install went from 7 steps to 2").
- **Gracey Dugar** (SayPDF) and **Leena Varma** (SpecFlow): won daily draws (random picks), and WeMakeDevs then promoted SpecFlow on LinkedIn.

### What social posts show
- Almost everything is on **LinkedIn**; X has a few builders (Ankith, Zeus); YouTube has 2 entry videos; Discord is empty.
- Most posts are "Day N, I dictated X words" with the **Flow Highlights / usage card image**. Few show a real workflow (which is what Social is ranked on).
- The post with most engagement we saw (Jaya Surya, 24 reactions, 7 comments) is a **personal story** (an accident forced him to use voice).
- **Ankith's "Wispr bloopers" post**: "WeMakeDevs" → "Vmac dose", "FalkorDB" → "Falter DB", "ShipLog" → "Shiplock"; "Adding them to my Flow dictionary tonight." Real users already feel the "Wispr gets my words wrong" pain.
- Old (non-entry) posts: free Wispr clones (wispr-fox, LocalFlow, a reverse-engineered "Flow"), Hinglish voice chess (42 reactions), a security write-up about an exposed Wispr storage bucket. So privacy and cost are live topics around Wispr.

### Gaps nobody fills yet
1. **Building on Wispr itself** (its accuracy, dictionary, snippets, usage): no entry. Only outside tools (MorningContext, wisprSummary) and a job-application prototype set.
2. Indian languages beyond Hinglish for everyday work (only one designer's post).
3. Real before/after numbers measured on the author's own work (rare).
4. Finished videos (2 of ~35).

## 5. What Wispr Flow can and can't give a product

| Source | What's in it | Can a product use it? |
|---|---|---|
| **Text Wispr types into our own page** | Exactly what Wispr heard, after its clean-up | **Yes.** Official output; Wispr's terms: "All your content remains yours"; "you own all Output" |
| **Wispr MCP server** (`api.wisprflow.ai/connect/mcp`) | Notetaker meetings (summaries, transcripts, tasks), Scratchpad, calendar. **No dictations.** Read-only, browser sign-in | **Yes**, official. Automatic after one sign-in |
| **"Download your data"** (Settings → Data and Privacy → Request a copy → email → download) | Checked Siddhu's export: profile, stats (total words, words/min, streak), **daily words per app**, dictionary, meetings with audio and transcripts, a "voice profile" (persona, most-used and most-removed word). **Dictation history was empty** (his dictations are stored only on the laptop) | Manual, slow, and missing the dictations. **Not usable for a product** |
| App's internal database on the laptop (`flow.sqlite`) | Every dictation, edits, apps | **No.** Wispr's terms forbid access "by any means other than our publicly supported interfaces" and reverse engineering |
| Insights screen (in the app) | Words, wpm, "Fixes made by Flow: N words corrected, M dictionary fixes", usage by category | Only as a screenshot (the usage card) |

**Siddhu's rule:** users must not do manual work (no exporting ZIPs). So a Wispr-native product must use either **the text Wispr types into our page** or **the MCP**.

## 6. The idea journey so far

| Round | What happened |
|---|---|
| 1 | Ideas built on wrong context (NautiCAI); dropped |
| 2 | CallCheck (voice-bot QA), Backed (resume with proof) etc.; ranked on rubric only |
| 3 | Re-ranked through the judges' eyes; Backed led |
| 4 | Siddhu's challenge: "Wispr only turns voice into text, so how is it the hero?" → ideas built on Wispr's own data |
| 5 | New scoring system (gates + anchored scores); Teach Wispr / Prompt Mirror / Interview Replay rated highest |
| Now | Data access checked: export and internal database are out; text-in-our-page and MCP are in |

### Scoring system (current)
- **Gates (must pass all):** Wispr is the hero (without Wispr the product makes no sense) · a non-engineer gets it in 10 seconds · a real number by 29 Oct · buildable in 5 days on free tiers · not crowded.
- **Anchored scores** (weights 30/30/25/15): e.g. Wispr = 10 only if the product is built on Wispr's own output/features and feeds back into Wispr; Works = 10 only if judges can try it on their own Wispr in under a minute.

### Candidates still on the table

| Idea | One line | Data path | Open problem |
|---|---|---|---|
| **Teach Wispr** (inside "FlowFit") | Find the words Wispr gets wrong for you and fix them (Dictionary entries), measure accuracy before/after | Was: internal history. **New option:** a 60-second "voice check" in our page: it builds sentences from *your* words (repo, resume, names, Hinglish/Telugu terms), you read them with Wispr, it compares what Wispr typed with what you meant, lists misheard words and gives Dictionary entries; re-test after adding them | Wispr already shows "N words corrected" counts in Insights, so we must show *which* words and *fix* them. Wispr has no dictionary import (last step is copy/paste) |
| **Prompt Mirror** | Find instructions you keep repeating to AI tools → Wispr Snippets + `CLAUDE.md` rules | Was: internal history. Without it, only what you dictate into our page or paste | Needs history to find repeats; weak without it |
| **Interview Replay** | Record mock interviews/recruiter calls with Wispr Notetaker; pull transcripts over MCP; score answers against the job description | **MCP (official, automatic)** | Few real interviews by 29 Oct; judges see a sample unless they connect their own Wispr |
| Flow Ledger | Daily work record from everything you dictated | Internal history only | Out: history is too mixed (four terminals) and access isn't allowed |
| Backed | Resume where every claim has proof | Input only | Out: fails "Wispr is the hero" |

## 7. Questions for the discussion with friends

1. Is "make Wispr understand *you*" (Teach Wispr with a voice check) a problem judges and users will care about, or too small/meta?
2. Would a Wispr-native tool look like "a tool for the tool" instead of "a tool for my work"? How do we frame it as a work problem (e.g. "I build by voice all day; misheard tech words cost me N fixes a day")?
3. Is Interview Replay (job hunt + Notetaker + MCP) stronger because the problem is more human and relatable?
4. Should we borrow the strongest pattern (voice → action on the thing you look at, like SayPDF)?
5. Any idea from your own life that passes all five gates?

## 8. Ready once the idea is chosen

- Day-1 base kit (`docs/BASELINE.md`): public link, sample data, voice + typing, works with AI off.
- Plan (`docs/PLAN.md`) will be redone for 24–31 Oct: core live day 1, real use daily, freeze, video and submit on 30 Oct.
- Video template: Sayso's chapter structure, ≤ 1:55 (`docs/DEMO.md`).
- Posts: LinkedIn + one dev.to blog, each showing a real workflow (`docs/SOCIAL.md`).

---

## 9. The hard question: if any speech-to-text can do it, why Wispr? (added 24 Oct)

**Siddhu's point:** most entries (SayPDF included) are "say it or type it" boxes. Wispr just pastes text, the app does the work, so any free tool (MacWhisper, the browser mic) or a keyboard gives the same result. MacWhisper even has more recording features (file and YouTube transcription, app audio, podcast mode, live captions, batch export, local models). So in those projects Wispr is a convenience, not the hero.

**He is right about plain dictation.** For "speech → text in a box", Wispr is replaceable. Where Wispr is actually different (checked on Wispr's What's New page and docs, 24 Oct):

| Wispr layer | What it does | Does MacWhisper / a free STT have it? |
|---|---|---|
| **Everywhere, every device** | Same account on Mac, Windows, **iPhone and Android** (keyboard / Flow Bubble); Scratchpad syncs across devices | MacWhisper is Mac-only |
| **Formatting model** | Removes fillers, keeps only the final version when you correct yourself ("Tuesday, no wait, Wednesday"), auto-cleanup levels, styles per app, personal dictionary that also feeds Notetaker | Lighter clean-up |
| **Programmable** | **Transforms** (beta): 10 shortcut slots (Polish, Prompt Engineer + 8 custom prompts), run on highlighted text **or automatically after each dictation**; Snippets (voice cue → rich text); Command mode (voice-edit selected text) | Partly (other apps have "modes") |
| **Notetaker** | Bot-less meeting recording, speaker labels, 21 languages, "Ask across meetings", Calendar + Slack connections | MacWhisper records meetings too |
| **MCP server** | AI agents (Claude, ChatGPT, Gemini, Cursor, Claude Code, your own) read your **meetings, transcripts, tasks, Scratchpad notes and calendar**. Read-only, browser sign-in, no API key. **No dictations** | No |
| Developer API | Not public (a "Voice Interface API" is mentioned in one help page; no docs) | — |

**The breakthrough framing:** stop building "a box Wispr types into". Build so that **Wispr is the voice layer and our product is the brain**:
1. **Capture happens inside Wispr**, on any device: Scratchpad notes (phone or laptop) and Notetaker meetings. Not in our text box.
2. **Our product reads it through Wispr's official MCP**, automatically after one sign-in (no export, no copy-paste).
3. **Where possible, results go back into Wispr**: Dictionary words, Snippets, Transform prompts.

Without Wispr, this product has no input at all. That passes the "Wispr is the hero" test honestly, and it shows Wispr's newest features (Scratchpad, Notetaker, MCP), which is exactly what the Wispr judge wants people to see.

### New ideas from this framing (not scored yet; for discussion)

| Idea | How it works | Real problem for Siddhu | Why Wispr is essential | Open risks |
|---|---|---|---|---|
| **Pocket Brief** (phone → repo) | Say a task into Wispr Scratchpad on the phone (walking, travelling). Claude Code (connected to Wispr's MCP) picks up new notes, turns each into a scoped task brief with acceptance checks, and queues it for approval on the laptop | Ideas come when away from the laptop; Claude Code hours are limited, so tasks must be ready when he sits down | Cross-device capture (phone keyboard + Scratchpad sync) + MCP. MacWhisper can't do phone → agent | Is Scratchpad readable over MCP on our plan? (docs say yes, read-only) Judges need a sample mode |
| **Interview Replay** (job hunt) | Mock interviews / recruiter calls recorded by Wispr Notetaker (bot-less). Our tool reads transcripts over MCP and scores each answer against the job description; best answers become a story bank | Job hunt is his biggest pain | Notetaker + MCP are the input | Wispr already has "Ask across meetings"; we must do what it doesn't (JD scoring, story bank, practice plan). Few real interviews by 29 Oct |
| **Meeting → decisions in English** (multilingual) | Telugu/Hindi/English work calls recorded by Notetaker → decisions, constraints and open questions in English, each linked to the transcript moment | Possible if his SIIMA calls mix languages (CHECK) | Notetaker's 21 languages + MCP | Close to a designer's entry (Kalaivanan) and to Wispr's own summaries |
| **Flow Recipes** | A tested pack of Transforms + Snippets + Dictionary for one job (e.g. "build with Claude Code": Prompt Engineer transform tuned to his CLAUDE.md, snippets for repeated rules), with a before/after test on real dictations | He repeats the same instructions; Wispr mishears tech words | It runs *inside* Wispr | Setup is copy-paste into Wispr's settings; judges may see it as configuration, not a product |

### Questions for the friends
1. Does "Wispr = voice layer on every device, our app = brain via MCP" feel like the right way to make Wispr the hero?
2. Which real problem fits it best: building with Claude Code (Pocket Brief), the job hunt (Interview Replay), or multilingual work calls?
3. Is it OK that judges mostly see a sample mode unless they connect their own Wispr (most of them use Wispr)?

**Update (24 Oct, after Siddhu checked his phone):** Wispr on **Android** has only Home, Dictionary, Style and Snippets. **No Scratchpad and no beta** (Scratchpad is Mac + iPhone only). So "Pocket Brief" from an Android phone is not possible. The only automatic, official data path left is **MCP → Notetaker meetings** (plus desktop Scratchpad).

## 10. Second research pass (24 Oct, 03:00 IST)

- **Official write path into Wispr exists:** Dictionary bulk import from CSV (`word` or `misheard,correct`) and Snippets import from JSON (`name`, `text`), desktop only, ≤ 3 MB / 1,000 new entries ([docs](https://docs.wisprflow.ai/articles/8955301725-how-do-i-bulk-import-for-dictionary-and-snippets)). Team libraries can be shared org-wide.
- **Wispr has a transcription API spec** ([api-docs.wisprflow.ai](https://api-docs.wisprflow.ai/request_schema)): audio + context (app, dictionary words, user name, text before/after the cursor, screenshot, page content, conversation). No sign-up, keys or pricing shown; another help page says the API service is not being offered now. Not usable this week.
- **Notetaker covers 21 languages, not Telugu.** Hinglish must be picked explicitly.
- **Others already read Wispr's MCP:** Scar Tissue and Debrief (Scratchpad, Notetaker). MCP reading alone is no longer unique.
- **Deadline re-checked live at 03:12 IST: Saturday 31 October, 11:59 pm IST** (the pasted research said 30 Oct; it could not load the pages). We still submit on 30 Oct.

---

## 11. Where we are now (24 Oct, decision so far)

**The idea we are building:** a tool that tests speech-to-text (STT) engines for Indian voice bots, using **Wispr Flow as the answer key**.

1. You speak a test line naturally (English, Hindi or Telugu, or a mix), like a caller to a voice bot.
2. **Wispr types what you said.** That text is the answer key. You fix it if Wispr got a word wrong.
3. The page records the same audio and sends it to the STT engines being tested (free ones first: Groq Whisper, Deepgram; Sarvam only if needed).
4. A scoreboard shows which engine understood you, where each one broke (names, numbers, Telugu words), and how fast it was.

**Why this one:** it is Siddhu's real weekly work at SIIMA (his logs show STT engines compared again and again on English, Hindi and Telugu), and Wispr is the judge, not just a text box. No entry tests speech engines.

### What we checked (all on 24 Oct)

| Check | Result |
|---|---|
| Can the page record the mic while Wispr is typing? | **Yes.** Full sentence recorded and played back |
| Wispr as answer key | **English and Hindi: perfect** in the test. **Telugu: partly wrong** ("ఎలా ఉన్నావు" right, the first half wrong), so the user must be able to fix Telugu words |
| Free STT keys | Groq and Deepgram keys work; Sarvam key saved but unused (credits protected) |

### The Telugu fix box (so users can correct the answer key without a Telugu keyboard)

Users type Telugu words in English letters ("vachavu") and get Telugu script (వచ్చావు), like easytelugutyping.com. We tested every free option on 256 hand-picked words and 864 everyday words:

| Option | Hand set, first guess right | Everyday set, first guess right | Notes |
|---|---|---|---|
| Google Input Tools (what easytelugutyping uses) | 91.8% | 86.6% | Not an official public API; used only as the yardstick |
| **IndicXlit (AI4Bharat, free, open source) with its rescore mode** | **93.8%** | **92.5%** | **Beats Google.** 25 ms per word |
| IndicXlit plain | 80.5% | ~71% | |
| Sanscript (rule-based, in browser) | 20% | — | Needs exact spelling; even fixed only 53% |

**Hosting problem:** IndicXlit needs a Python server, and Hugging Face now charges for that ("requires a PRO subscription"). So we are **converting IndicXlit to run inside the browser** (ONNX format): no server, free, instant. A second Claude session is doing this in the background now.

### Next steps
1. Finish the in-browser Telugu typing (background session).
2. End-to-end test: one recorded line → Groq Whisper and Deepgram → compare with Wispr's text.
3. Write the build spec, then build the core loop and put it online.
4. Real use on Siddhu's own test lines from 25 Oct; measure.
5. Video, README, posts; submit on 30 Oct.
