# Positioning: Call-flow designer + live call (24 Oct 2026, draft)

## The insight
Voice bots are meant to talk, yet every tool builds them by typing prompts and dragging boxes (Voiceflow, Vapi, Retell).
The people who know how the call should go (a shop owner, a support lead, a clinic manager in India) explain it by
speaking, often in Telugu or Hindi mixed with English. Today an engineer (me, at SIIMA) translates that talk into
prompts and boxes by hand, then tests with real phone calls.

## One line
**Talk your voice bot into shape, then call it before your customers do.**
Brief it by voice, test it by voice, fix it by voice. No typing, no dragging, in Telugu, Hindi or English.

## Name ideas
- **Rehearse**: "rehearse the call before it's real"
- **DryRun**: "a dry run for your voice bot"
- **BoloFlow** ("bolo" = speak): Indian, memorable

## How it feels different from Voiceflow / Vapi / Retell
| They | We |
|---|---|
| Drag boxes, type prompts | Speak; the flow draws itself and rewires as you correct yourself |
| English-first | Telugu, Hindi, English and mixes, from the first word |
| Test by typing or a real phone call | Role-play the caller by voice; watch the path light up turn by turn |
| Rules hidden in a long prompt | Hard rules ("never promise a refund") shown as guard lines; a broken rule flashes red in the test call |
| Fix in a settings panel | Say the fix at the red spot ("if they ask for a refund, offer a manager callback"); the flow rewires; call again |
| Locked to their platform | Export the flow and prompt for Pipecat, Vapi or Retell ("design here, run anywhere") |

## Why it's the best use of Wispr Flow
Wispr is used in all three loops, each where voice is the natural input:
1. **Brief:** a long, messy, mixed-language explanation of how the call should go. Wispr turns it into clean, structured text. (Typing a call script with branches and exceptions is slow; saying it is how people already explain it.)
2. **Rehearse:** you play the customer, by voice, in the language your callers use: angry, confused, switching to Hindi mid-sentence. Wispr gives exact text for each turn, so the test needs no separate speech engine.
3. **Fix:** you say the change at the exact spot that failed. Wispr's clean-up keeps only what you finally meant ("ask the name… actually, ask the order number first").

## Hero demo (about 2 minutes)
1. 0:00 Problem: "I build voice bots for Indian businesses. The owner explains the rules in Telugu; I spend hours turning that into prompts and boxes."
2. 0:15 Hold fn, speak the brief in Telugu-English; the call flow draws itself live.
3. 0:45 "Call" the bot as an angry customer in Telugu; the path lights up; the bot promises a refund; the guard line flashes red.
4. 1:10 Say the fix at the red node; it rewires; call again; green.
5. 1:30 Export for Pipecat/Vapi. Real result with a number (time from brief to a tested bot, mine before vs after).
6. 1:45 Usage card, how to try it.

## Scope guard
In: browser app, one flow at a time, Telugu/Hindi/English, text replies in the test call (voice output optional later), rule guards, export.
Out: real phone calls, accounts, many bots management, analytics dashboards, voice cloning.
