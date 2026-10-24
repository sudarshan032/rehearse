# FlowFit: features (draft for discussion, 24 Oct)

**One line:** FlowFit makes Wispr Flow learn you. It finds the words Wispr gets wrong for you, turns the replies and context you repeat into spoken shortcuts, and puts every fix inside Wispr through Wispr's own Import button.

**Who it's for:** me first (I build software by voice all day), then anyone who uses Wispr for work, especially Indian developers whose names and tech words trip it up.

**Ground rules for every feature**
- One web page, no sign-in, no backend, free hosting. Everything stays in the browser (local storage). Nothing is uploaded.
- Works with Wispr (hold Fn and speak into the box) and without it (type into the box), so every judge can try it.
- No AI needed for the core. AI is optional and only for nicer wording.
- Only official Wispr paths: text Wispr types into our page (read), Dictionary CSV and Snippets JSON through Wispr's Import button (write), Wispr MCP through Claude Code (optional read).
- Opens with sample data (my real run), clearly labelled.

---

## Feature 1. "Hear me right": find and fix the words Wispr gets wrong

### How it works
1. **Collect your words.** Paste any text that holds your vocabulary: a public GitHub repo link, your resume, a README, a list of names (colleagues, recruiters, clients, places, Telugu/Hinglish words). FlowFit picks out likely problem words by simple rules:
   - names and capitalised words (Govindaluri, Anju Siima)
   - mixed-case and joined words (LangGraph, WeMakeDevs, FalkorDB)
   - package names from `package.json` / `requirements.txt` (pgvector, langchain)
   - acronyms and words with digits (YOLOv8, CTC)
   You see the list, untick what you don't want, add missing words, and tag each as person, tool, place or other.
2. **Voice check.** FlowFit builds short natural sentences from templates, each with 1–2 of your words ("Add pgvector search to the LangGraph agent today."). Every word appears **3 times** across the check, in different sentences, because Wispr's result changes between tries (my test: pgvector wrong 3 of 6 times).
   - You hold Fn and read the sentence. Wispr types it into the box.
   - The page notices the text landing in one go and moves to the next sentence after about 1 second (or press Enter).
   - About 10 sentences, roughly 60–90 seconds.
3. **Compare.** For each word, FlowFit compares what you meant with what Wispr typed. It handles splits and merges ("Lang graph", "PG Vector", "PGPG vector") and checks spelling and capitals separately (a capital only because the word started the sentence is ignored).
4. **Results.** A table per word: right / wrong / wrong capitals, how often, and the exact wrong versions Wispr produced. Example: "pgvector: wrong 2 of 3 (PG Vector, PGPG vector)".
5. **Fix inside Wispr.** FlowFit writes a Dictionary CSV:
   - the correct word on its own (so Wispr's speech model knows it), and
   - each wrong version → correct word (so Wispr replaces it if it hears it again).
   Then three steps on screen: open Wispr → Dictionary → Import → pick the file. Wispr skips words you already have, so importing twice is safe.
6. **Re-test.** Same words, new sentences. A before/after bar per word and a total: "My 30 words: 33% wrong → 5% wrong".
7. **Dictionary health check (small extra).** Paste your current Wispr dictionary words; FlowFit flags entries that cause trouble, e.g. a name saved in ALL CAPS (that's why my name came out in capitals).

### User experience
Paste words → tick list → read 10 sentences → see red words → download one file → one Import in Wispr → re-read → see green. About 3 minutes the first time, 1 minute for later checks.

### Day-to-day impact
- Prompts to Claude Code and ChatGPT come out right first time, so the agent doesn't act on "PG Vector" or "Vmake Devs".
- Names of people I write to (recruiters, colleagues, clients) are spelled right in messages and in Notetaker meeting notes, since Wispr uses the same dictionary there.
- Fewer manual fixes every day. That's the number we measure.

---

## Feature 2. "Say it once": your repeated replies become spoken shortcuts

### How it works
1. **Collect replies.** Paste messages you've sent before (recruiter replies, WhatsApp answers), or start from ready templates for the job hunt: notice period, expected salary, availability, portfolio and GitHub links, "thanks, happy to connect", interview slot confirmation.
2. **Find the repeats.** FlowFit groups messages that say the same thing (simple word-overlap matching, no AI) and suggests one clean version of each.
3. **Pick a spoken cue** for each reply, 2–3 words, for example "notice reply", "my portfolio", "slot confirm". FlowFit checks that:
   - each cue is different from the others, and not a phrase you'd say by accident;
   - Wispr hears the cue correctly: you say each cue 3 times in a mini voice check (the same engine as Feature 1). If Wispr mishears the cue, the shortcut would never fire, so FlowFit suggests another cue.
   - Cues can be English, Hinglish or Telugu words, if Wispr types them reliably.
4. **Fix inside Wispr.** FlowFit writes a Snippets JSON (`name` = cue, `text` = reply, up to 4,000 characters). One Import in Wispr → Snippets.

### User experience
Paste or pick replies → accept groups → choose cues → quick cue check → download → one Import. Then anywhere, on Mac or Android, say "notice reply" and the full message appears.

### Day-to-day impact
- Recruiter and WhatsApp replies in one spoken phrase, on the laptop and the phone (Wispr syncs snippets).
- Same wording every time: no typos in links, no forgotten details.
- Number: characters typed per reply before vs after, and replies sent per week.

---

## Feature 3. "Brief my AI": your context in one spoken cue

### How it works
1. **Collect sources.** Paste or drop files that describe you and your work: `CLAUDE.md`, resume, a project README, your rules ("plain English, free tiers only, never touch graph_hacks").
2. **Make cards.** FlowFit cuts them into short cards by heading, for example:
   - "my profile": who I am, role, skills
   - "project brief": what I'm building, stack, status, deadline
   - "house rules": how I want an AI to work with me
   Each card is checked against Wispr's 4,000-character snippet limit and trimmed to the most important lines. You edit before saving.
3. **Pick cues** ("brief flowfit", "my rules") and run the same cue check as Feature 2.
4. **Fix inside Wispr.** Snippets JSON → one Import.
5. **Keeping cards fresh.** Wispr skips a snippet whose name already exists, so updating a card means either deleting the old one in Wispr first or using a new cue with a version ("brief flowfit 2"). FlowFit shows which cards changed since the last export. (Test on day 1 which way is easier.)

### User experience
Drop files → review cards → choose cues → download → one Import. In any new Claude, ChatGPT or Claude Code chat, say "my rules" and the whole brief appears.

### Day-to-day impact
- No more re-explaining who I am and what the project is at the start of every AI chat.
- The AI gets the same complete context every time, so fewer wrong answers caused by missing context.
- Number: words I no longer type or say per new chat, times chats per day.

---

## Shared parts

| Part | What it does |
|---|---|
| **Voice-check engine** | Shows a line, catches the text Wispr types, compares it with what was meant. Used by all three features. |
| **Export** | Writes the Dictionary CSV and the Snippets JSON in Wispr's documented formats (CSV: one column, or `misheard,correct`; JSON: array of `name` + `text`). |
| **Import guide** | Three steps with screenshots: Wispr → Dictionary or Snippets → Import → pick file. |
| **Progress page ("Proof")** | Dated history of every check: before/after per word, snippets created, my real numbers. This is the "real result" for the submission. |
| **Sample mode** | Opens with my real run (my words, what Wispr typed, my files), labelled as sample, so a judge sees everything in 10 seconds. |
| **Try it yourself** | A judge with Wispr reads a sample Indian-tech card and gets their own score in about a minute. |

## Optional (only if the core is done early)

- **Claude Code helper using Wispr MCP:** a command that reads my Wispr calendar attendees and meeting titles (official, read-only) and adds the names to my word list. Makes "Hear me right" learn the people I'm about to talk to.
- **Hinglish/Telugu card:** a voice check made of mixed-language sentences.
- **AI wording:** nicer sentences and reply clean-up with a free AI tier, with the rule-based version as fallback.

## Build order (rough)

1. Voice-check engine + Feature 1 (the core and the main number).
2. Export + import guide + re-test + Proof page.
3. Feature 2 (reuses the engine and export).
4. Feature 3 (reuses Feature 2's snippet export).
5. Sample mode, design pass, video, README.

## Questions to settle before the spec

1. Word sources on day 1: paste text + public GitHub repo link enough? (Resume as pasted text, not PDF.)
2. Should cues support Telugu/Hinglish from the start, or English first?
3. AI: leave it out completely, or allow an optional free-tier step?
4. Is the MCP helper worth it given you rarely use Notetaker/calendar in Wispr?
5. Desktop-first page, or must it also work well on the phone? (Import only works on desktop.)
