# Decision table (24 Oct 2026)

What Siddhu wants (his words): unique in this hackathon, simple, interactive, visual ("speak → something changes live"), a real problem from his work, built in 4–5 days.
Scores out of 10. "Unique here" = against ~45 entries we found. "Exists elsewhere" = outside the hackathon.

| # | Idea | One line | Real problem (his) | Wispr's role | Wow / live visual | Unique here | Exists elsewhere | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Backed | Resume where every claim has proof | 9 | Input only | 3 | Yes | Many AI resume tools | Out: Wispr not the hero |
| 2 | CallCheck | Review voice-bot calls by talking over them | 7 | Notes while listening | 4 | Yes | QA tools | Out: "not relevant" |
| 3 | FlowFit (Hear me right) | Find and fix words Wispr gets wrong | 3 | Hero | 5 | Yes | No | Out: errors were fast speech, not Wispr |
| 4 | Reply Kit / Brief my AI | Repeated replies and context as Wispr Snippets | 5 | Hero | 3 | Yes | Wispr's own feature | Out: just Wispr's Snippets |
| 5 | Prompt Mirror | Repeated AI instructions → snippets | 6 | Output | 2 | Crowded | Yes | Out |
| 6 | Interview Replay | Notetaker mock interviews scored vs JD | 6 | Notetaker + MCP | 4 | Yes | Interview tools | Parked: few real interviews |
| 7 | Flow Ledger / Pocket Brief | Work log or phone tasks from Wispr data | 6 | Data source | 3 | MCP readers exist | Yes | Out: history too mixed; no Scratchpad on Android |
| 8 | STT test suite | Your voice as test set, Wispr as answer key | 8 | Draft answer key | 4 | Yes | Benchmarks | Out: a one-off Claude prompt does it |
| 9 | Speak a bot / SpeakBots | Describe a bot by voice, talk to it | 8 | Input + brief | 7 | Yes | GPTs, Gems, Cherry Studio, LobeHub, Msty | Out: core idea too common |
| 10 | Talk-through system design | Design, edit, simulate architecture by voice | 7 | Input | 9 | **No (4th: Chalk, SaySketch, VoiceArchitect)** | Eraser, PRISM, LeetSys | Out: most crowded visual idea |
| 11 | **Call-flow designer + live call** | Speak a voice bot's call script → flow draws live → "call" it by voice and watch the path light up, red where it breaks a rule | **9** (SIIMA, weekly) | Input (mixed-language rules) | **9** | Partly (diagram-by-voice exists, voice-bot flows + talking to the flow do not) | Voiceflow, Vapi, Retell builders (click/drag, not voice) | **Alive, not yet judged by Siddhu** |
| 12 | Speak your portfolio | Talk, portfolio site builds and restyles live | 6 (job hunt) | Input | 8 | Yes | Lovable, v0, Bolt | Alive, but common elsewhere |

## What is left

Only **11 (Call-flow designer + live call)** and **12 (Speak your portfolio)** are still alive.

- **11** has the strongest mix: real weekly work at SIIMA, a live visual that reacts to voice twice (while you design and while you "call" it), Telugu/Hindi/English, and no entry builds or talks to voice-bot flows. Risk: it is still a diagram, and Voiceflow/Vapi/Retell build call flows (by clicking, not by voice).
- **12** is the most "wow" for anyone, but Lovable/v0/Bolt do it by text and the real problem is weaker.

## What needs to be done next

1. Siddhu picks 11, 12, or "neither" today.
2. If 11 or 12: a clickable mock on http://localhost:8768 first (to see it), then the build spec, then build.
3. If neither: stop searching for "exists nowhere"; pick the highest-scoring idea from this table and execute it well.
