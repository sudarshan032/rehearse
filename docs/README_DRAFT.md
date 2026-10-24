# Rehearse

**Talk your voice bot into shape, then call it before your customers do.**
Build, rehearse and fix a phone voice agent just by speaking, in Telugu, Hindi or English.

[Try it live, no sign-in →](LIVE_URL) · [Demo video (1:50)](VIDEO_URL) · Builders track, No Hands: The Wispr Challenge

**Who it's for:** me, an AI engineer who builds voice bots for Indian businesses, and anyone who knows how a call should go but doesn't want to write prompts or drag boxes.

## Proof

| | |
|---|---|
| **Real result** | (fill on 29 Oct from docs/results.md: minutes from brief to a tested bot, my old way vs Rehearse; rule breaks caught before a real call) |
| **Wispr usage** | (words dictated 16–31 Oct, usage card below) |
| **Built by voice** | Every prompt to Claude Code and most commit messages were dictated with Wispr Flow ([daily log](voice-log.md)) |

## Try it in one minute

1. Open the site. Click **See a finished sample** (or say "show me the sample").
2. Say **"play the sample call"**. A Telugu caller asks about refunds; the bot promises one and **rule 1 turns red**.
3. Hold your Wispr key and say the fix: *"if they ask for a refund, say the trial is free and offer a manager callback"*. Then say **"replay"**: same line, new answer, green.
4. Build your own: say "start a new bot" and describe it. It asks 3–5 short questions; answer them all in one go.

No Wispr? Type in the same box; it works the same. The sample bot and its saved call work even with the AI off.

## The problem

At work I build voice bots. The owner explains the call by talking, often in Telugu or Hindi mixed with English. I turn that into prompts and flow boxes by hand, then test with real phone calls. Rule breaks ("the bot promised a refund") are found by customers. Every voice-bot builder (Vapi, Retell, Voiceflow, Synthflow) is still built by typing and dragging.

## Why voice

A call script with branches, exceptions and "never say this" rules is how people already explain things out loud. Saying it is faster than typing it, and playing the caller by voice is the natural way to test a voice bot. Wispr Flow turns messy mixed-language speech into clean text in the one box Rehearse listens to.

## How it works

- **One box, three jobs for Wispr:** the brief, playing the caller, and the fix. `@Greet`, `@Rule 2`, `@Last reply` point your words at one part of the bot.
- **Rule-based first:** navigation ("show the rules", "back", "next"), rule checks with keywords, and the flow layout are plain code. The AI is only asked when needed.
- **AI (free tier):** Groq `gpt-oss-120b` writes the questions, the blueprint (flow, rules, facts) and the bot's replies; it also checks unclear rule breaks and applies spoken edits as small JSON patches. OpenRouter free models are the fallback.
- **The prompt is compiled** from the flow, rules and facts, never hand-edited, so what you see is what the bot runs on.
- **Export:** Bot JSON, prompt, Vapi, Retell and Pipecat starters.

## Run it locally

```sh
npm install
cp .env.example .env   # add GROQ_API_KEY (free); OPENROUTER_API_KEY optional
npm run dev            # http://localhost:3000
```

## What it does not do (yet)

- No real phone numbers; calls happen in the browser.
- The voice test uses free engines (plain voices), not production TTS.

## How it was built

- Built solo, 23–30 Oct 2026, for No Hands: The Wispr Challenge (WeMakeDevs × Wispr Flow).
- **AI assistance:** I directed Claude Code by voice (Wispr Flow) and reviewed every change. The product uses Groq's free tier.
- Stack: Next.js, TypeScript, plain CSS, zod, Groq.
