# Submission form: ready answers

Form: https://www.wemakedevs.org/wispr/submit (sign in first). Fields come from `docs/SUBMISSION.md` (read out by
Siddhu on 24 Oct). **No editing after Submit**, so fill every `[ ]` first. Plan: submit Fri 30 Oct, spare day Sat 31 Oct.

Marks used below:
- **Video link:** https://youtu.be/u4y-gDxb1ZQ
- **Wispr words:** 61,952 over 2 weeks, 110 wpm (from the Wispr app, given by Sudarshan on 27 Oct).
- **Blog (dev.to, published 28 Oct):** https://dev.to/sudarshan032/i-stopped-finding-voice-bot-bugs-on-real-calls-now-i-rehearse-them-by-voice-2l9m
- **LinkedIn post (published 28 Oct):** https://www.linkedin.com/posts/sudarshansastry_nohandschallenge-nohandschallenge-wisprflow-share-7520940328674078720-W7Wn/ (short link: https://lnkd.in/p/d8Wk52HW). Put it in the weekly check-in.
- **(not verified)**: I could not check this myself. Check it before you paste.

---

## Part 1. Project details

### Project title
```
Rehearse
```

### Track
```
Builders, for developers
```

### Demo video link
```
https://youtu.be/u4y-gDxb1ZQ
```
Checks: unlisted, opens in a private window, length in the player is 1:55 (under 2:00), YouTube auto captions on.
Paste the music credit from `video/out/README.md` into the description (this cut uses "Inspired" by Kevin MacLeod, CC BY 4.0).

### Link to your working project
```
https://rehearse-ecru.vercel.app
```
Opens with no sign-in. A sample bot is ready on the first screen: click "Watch a bot break a rule".

### About the project (about 120 words)
```
At work I build phone voice bots in Telugu, Hindi and English. One sales bot went live in a day but took about 3 weeks of real and test calls before it stopped breaking its rules, because every break was found by callers. Rehearse is for people like me who build voice bots: you describe the bot by speaking, it asks a few questions and draws the call flow, rules and prompt, then you rehearse calls by voice. A broken rule turns red, you say the fix, and the same caller line is replayed. On my own bot, the first rule break showed up 3.1 minutes after the brief. I built it by dictating every prompt to Claude Code with Wispr Flow: 61,952 words. Repo: https://github.com/sudarshan032/rehearse
```
Check: the repo must be public before you submit, or this link is a dead end for judges.

---

## Part 2. How you used Wispr Flow

### Usage card (image upload)
**Official Wispr screenshot: not taken yet.** A stand-in card we made is at `docs/submission/usage-card.png`
(61,952 words, 2 weeks, 110 wpm; it says it is not a Wispr screenshot). It is in the blog and on the site. Upload the
real Wispr screenshot to the form if you can take it; use the stand-in only if the form accepts it.
Take it on submit day: Wispr Flow desktop app > Insights > Your usage. Crop out your email if it shows.
Save it as `docs/submission/usage-card.png` too, so the README can show the same image.
For reference only (not the official number): the local Wispr history on this Mac shows **52,690 words in 598
dictations, 23–27 Oct**. 34,635 of those went into Terminal (Claude Code), 12,671 into Cherry Studio, 4,962 into Chrome.

### Feedback on Wispr Flow (about 90 words)
```
I used Flow for almost all my writing in this challenge: every prompt to Claude Code, specs, commit messages and these answers. My longest single dictation was a 1,611-word build brief, which I would never have typed. It handles my mix of English with Hindi and Telugu words better than I expected, and it pastes cleanly into Terminal. What went wrong: it sometimes spelled product words its own way ("Whisper" for Wispr, "free trail" for free trial) (not verified). A request: a per-app word count in Insights, so I could show how much went into my code tool.
```
The misheard-word examples come from the recording's transcript, not from Wispr's own output. Swap in a real
mistake you saw in Wispr if you remember one, or delete that sentence.

---

## Before you press Submit (30 Oct)

- [ ] Repo made public; `git log -p | grep -iE "gsk_|api_key|token"` is clean
- [x] YouTube video uploaded, link in README and posts
- [x] dev.to blog published, with the usage card image
- [x] LinkedIn post published
- [x] 61,952 filled in "About the project"
- [ ] Real Wispr usage screenshot taken (Insights > Your usage) and uploaded
- [ ] Wispr feedback: replace or delete the "Whisper" / "free trail" sentence
- [ ] Live link and video opened in a private window, and on the phone
- [ ] Every field read aloud once
- [ ] Screenshot of the filled form saved (not committed)
