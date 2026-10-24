# How people feel using Rehearse: research notes (25 Oct)

Why: the app worked, but it was built feature-first. These are the behaviour and UX ideas that matter most for a
first-time user and a 2-minute judge demo, with what we did about each.

| Idea | Source | In Rehearse |
|---|---|---|
| Show the payoff fast ("aha" in seconds) | [NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/) | Done: the first button is "Watch a bot break a rule". It opens the sample and plays the call; the red break shows in about 10 s |
| Always show what the system is doing | [NN/g visibility of status](https://www.nngroup.com/articles/visibility-system-status/) | Done: the voice test shows Listening / Thinking / Bot speaking, as a word plus a small level meter; no flashing rings |
| End on the best moment (peak-end rule) | [Laws of UX](https://lawsofux.com/peak-end-rule/) | Done: the fix card shows Before (red) and Now, with "Replay the same line" right there |
| Undo beats "are you sure?" | [NN/g user control](https://www.nngroup.com/articles/user-control-and-freedom/) | Done: an "Undo this fix" button on the fix card; "undo" by voice everywhere |
| Recognition over recall | [NN/g](https://www.nngroup.com/articles/recognition-and-recall/) | Done: "Try" phrases under the box change with each screen |
| Empty states that teach | [NN/g](https://www.nngroup.com/articles/empty-state-interface-design/) | Done: before the first live call, a short note explains how real calls go and asks you to try cutting in (barge-in) |
| Say what an export really does | Vapi and Retell docs: no dashboard import, API only | Done: Export lists where each option goes, with "Copy prompt" and ready curl commands |
| Explain the AI's work | [Google PAIR](https://pair.withgoogle.com/chapter/explainability-trust/) | Partly: a broken line shows the rule and the quote. Next: show "from what you said: …" on each rule |
| People value what they helped make (IKEA effect) | [Norton et al. 2012](https://www.hbs.edu/ris/Publication%20Files/11-091.pdf) | Next: label rules "your rules, in your words" and keep the user's phrasing |
| Unfinished tasks pull people back (Zeigarnik) | [Laws of UX](https://lawsofux.com/zeigarnik-effect/) | Next: after a rehearsal, "2 of 5 rules tested, try an angry caller" |

How other builders start a first-timer (Vapi, Retell, Voiceflow, Synthflow, ElevenLabs): template → a one-click
browser test call within about 2 minutes. None of them checks rules during a test, turns a broken line red, or
fixes it by voice. That gap is the Rehearse story.

Voice-command edge case found by Siddhu: "drop the panel on the left in the describe page" went to Describe.
Rule now: screen controls (panel, theme, zoom, scroll) are matched anywhere in the sentence and before navigation,
so a place named only as a location ("in the describe page") does not move you.
