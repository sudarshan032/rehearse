# Results: building a voice bot, my old way vs Rehearse

Real work, real numbers. Client names, scripts and call data are left out (the bots were built for a client under
NDA); only counts and timings are shown.

## The task measured

From "here's what the bot should do" (the client's brief) to a bot that has been tested on calls and fixed where it
broke a rule.

## Before: my old way (voice agents I built at work, Sep–Oct 2026)

How it was measured: my own work repository (git history, 104 commits, 30 Sep → 24 Oct 2026), the prompt version
counters the platform stores, my checkpoint logs (35 errors, 52 fixes recorded) and the call-review notes. Only counts
and dates are used here; client names, prompts, call audio and transcripts stay private.

**What I built:** 7 outbound and inbound voice agents for a small-business app (sales, onboarding rescue, trial-expiry
conversion, support triage, win-back, renewal reminder, retention), live in English, Hindi and Telugu: 22 live bots
at the peak. Each one carries 9 to 16 "never/always" rules plus 36 company-wide rules.

**The slowest part was not building, it was finding where a bot breaks.** The trial-expiry sales agent (EN/HI/TE):

| | Old way |
|---|---|
| First version live | 1 day (2 Oct) |
| Until it stopped breaking rules on calls | about 3 weeks (2 → 24 Oct), still getting Telugu fixes |
| Prompt saves | about 87 (English v38, Telugu v30, Hindi v19) |
| How breaks were found | real and team test calls (18 team test calls in one day; 31 scripted test scenarios; 58 recorded caller clips), then reading transcripts by hand |
| Rule breaks found only after calls happened | booked a demo without a clear yes; offered a slot that does not exist; wrong add-on price in 6 of 9 calls; hung up when the caller said only "hmm" / "ठीक है"; Telugu replies leaked other scripts; greeting reply dropped in 3 of 5 calls |

## Picked for the "after" test

1. **Trial-expiry sales agent (EN/HI/TE)**: the richest real history. In Rehearse I rebuild it by voice and replay
   the caller lines that broke it in real life ("hmm", "can I do Sunday?", "how much for 3 staff?", a Telugu caller).
   Measured: minutes until each of those breaks is caught and fixed.
2. **Paid renewal reminder**: a short, strict bot ("never promote during a renewal reminder"). Measured: brief to a
   tested, exported bot.

## After: the same kind of bot in Rehearse (24–29 Oct)

How: Rehearse records the time of each step for every bot (say "copy my timings" on My bots to get this table).
Same brief as the "before" bot, rewritten without client details.

| Date | Bot | Built (min) | First test call | First rule break caught | Fixed + retested | Exported | Changes |
|---|---|---|---|---|---|---|---|

## Result

[one sentence with the number, e.g. "From brief to a tested, fixed bot: X h before, Y min with Rehearse; Z rule breaks caught before any real caller"]

Where it loses (honest): [e.g. no real phone numbers; voices in the test are free browser voices]
