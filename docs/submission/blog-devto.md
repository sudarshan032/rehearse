---
title: "I stopped finding voice bot bugs on real calls. Now I rehearse them by voice."
published: false
tags: nohandschallenge, wisprflow, wemakedevs, voiceai
cover_image: https://img.youtube.com/vi/u4y-gDxb1ZQ/maxresdefault.jpg
---

At work I build phone voice bots for small businesses in India. They call people in English, Hindi and Telugu.
The bots are not hard to build. The hard part is finding where they break.

For No Hands: The Wispr Challenge by WeMakeDevs and Wispr Flow, I built **Rehearse**: a tool where you build,
rehearse and fix a voice bot just by speaking.

{% embed https://youtu.be/u4y-gDxb1ZQ %}
Try it, no sign-in: https://rehearse-ecru.vercel.app
Code: https://github.com/sudarshan032/rehearse

## The problem in my work

One of my bots calls salon and clinic owners whose free trial is about to end, and helps them pick a paid plan.
It has rules like "never book a demo without a clear yes" and "never offer a discount".

The first version went live in one day. Then it took **about 3 weeks** and **about 87 prompt saves** before it
stopped breaking those rules. Every break was found the slow way: real calls and team test calls, then reading
transcripts by hand. I reviewed 58 call recordings in that time.

Some of the breaks I found only after calls happened:

- It booked a demo when the caller only said "hmm".
- It hung up when the caller said "ठीक है" (okay).
- It gave a wrong add-on price in 6 of 9 calls.
- Telugu replies mixed in other scripts.

The owner explains a call by talking, often in Telugu or Hindi mixed with English. I turn that into a prompt by
typing. Then callers find my mistakes, weeks later. Every voice bot builder I know is built by typing and dragging
boxes, and none of them checks your rules while you test.

## What Rehearse does

1. **Describe the bot by speaking.** I hold the Wispr Flow key (fn on my Mac) and talk, like briefing a teammate.
2. **It asks a few questions.** Prices, what counts as a good call, when to hand over to a human. I answer out loud.
3. **It draws the blueprint:** the call flow, the rules, the facts and the prompt. The prompt is built from those
   parts, so what you see is what the bot runs on.
4. **Rehearse.** I play the caller. The path lights up as the call moves. When the bot breaks a rule, that line and
   the rule turn red.
5. **Fix by voice.** I point at the step or rule and say the fix. Rehearse shows before and after, then replays the
   same caller line so I can see the rule hold.
6. **Voice test.** A real call in the browser: I speak, the bot answers out loud, and I can cut in while it talks.
   The call follows the caller's language, even when they switch to Hindi or Telugu mid-call.
7. **Export** the prompt, or ready commands for the voice platforms I use.

It works by typing too, in the same box. The sample bot and its saved call work even when the AI is off.

## The result

I rebuilt my trial-expiry sales bot in Rehearse, from the same kind of brief, by voice.

- Built in **1.7 minutes**.
- First rule break caught in a rehearsal **3.1 minutes** after the brief, before any caller.
- With my old way, breaks were found by real callers over **about 3 weeks**.

To be honest about the limits: there are no real phone numbers yet (calls run in the browser), the test voices are
free voices, and this is one rebuilt bot, a small sample. How I measured both sides:
[docs/results.md](https://github.com/sudarshan032/rehearse/blob/main/docs/results.md).

## How I built it without typing

I built Rehearse the same way it works: by speaking. I held the Wispr key and told Claude Code what I wanted, then
reviewed every change. Specs, plans, commit messages and this post were dictated too. I still used the keyboard for
shortcuts and small fixes.

My Wispr Flow app shows **61,952 words** dictated over 2 weeks, at **110 words per minute**. The local history on my Mac counted 52,690 words
in 598 dictations from 23 to 27 Oct, and 34,635 of them went straight into the terminal. My longest single
dictation was a 1,611-word build brief. I would never have typed that much detail, and the extra detail is what
made the first try right more often.

![My Wispr Flow usage: 61,952 words, 2 weeks, 110 words per minute](https://rehearse-ecru.vercel.app/usage-card.png)

## Why voice fits this job

A call script with branches, exceptions and "never say this" rules is how people already explain things out loud.
Saying it is faster than typing it. And a voice bot should be tested by voice: playing the caller out loud finds
problems that typed tests miss, like a caller who only says "hmm".

## What I learned

- **Say the done-condition out loud.** When I told Claude Code what "finished" looks like, the first version was
  right more often.
- **Rule-based first, AI second.** Navigation, rule checks and the flow layout are plain code. The AI is only asked
  when it is really needed, so the app stays fast and works on a free tier.

## What's next

This started because of the hackathon, but I'm not stopping when it ends. Next: real phone numbers, better voices,
and checking speed, cost and call quality before a bot goes live.

If you build voice bots, try it and tell me where it breaks.

#NoHandsChallenge
