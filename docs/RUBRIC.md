# Rubric: how projects are judged

Source: https://www.wemakedevs.org/wispr/judges ([snapshot](official/wispr-judges_2026-10-23.md)), checked 23 Oct 2026.
The weights are animated on the page; the values below come from the page data and match the launch blog
("real problem in your work (30%), how you used Wispr (30%), whether it works (25%) and how clear your demo is (15%)").

Official intro: "Four questions, weighted, and fixed before the challenge starts."

## The four questions (official wording)

| Weight | Question | What the page says under it |
|---|---|---|
| **30%** | "Does it solve a real problem in your work?" | "A specific problem, a clear user, and a tool that person would keep using." |
| **30%** | "Was Wispr used meaningfully?" | "Flow is part of the build and the workflow, and your demo and usage card show it." |
| **25%** | "Does it work?" | "A live link the judges can open and use." |
| **15%** | "Is the demo clear?" | "A two-minute video anyone can follow." |

## What a judge must see for full marks

### 1. Real problem in your work (30%)

A judge gives full marks only if all of these are visible in under a minute (README top + first 20 s of video):

- [ ] **A specific problem in one sentence**, in my own words, with how often it happens ("every week I …").
- [ ] **A clear user**: me first, then people like me. Named by role, not "everyone".
- [ ] **What I did before** the tool, and what it cost (minutes, mistakes, missed items).
- [ ] **One real result with a number**, from my own real material during 24 to 29 Oct (for example "reviewed 240 predictions in 31 minutes instead of 75").
- [ ] **Proof I kept using it**: a usage log with dates (several real sessions, not one).
- [ ] Not a copy of an official example or of the sample submission. If it is close, the README says how it differs.

### 2. Wispr used meaningfully (30%)

- [ ] **In the build:** prompts, specs, README, commit messages and posts were dictated. Shown by the usage card and by `docs/voice-log.md` (daily words + what was dictated).
- [ ] **In the product:** the main input is made for speaking. Hold the Wispr key, talk, and the tool works from that text. The video shows this live.
- [ ] **Why voice beats typing here** is said in one line (hands busy, eyes on something else, thinking aloud is faster).
- [ ] **Usage card screenshot** from Insights > Your usage, uploaded with the submission and shown in the README and video.
- [ ] **A short clip of Flow in use** (the blog asks for it): the Flow bar on screen, then the text landing.
- [ ] Honest numbers: word counts come from the card, never estimated.

### 3. Does it work (25%)

- [ ] **A live public link.** Opens with no sign-in, no API key, no payment, no waiting for a cold start.
- [ ] **Sample data on the first screen**, so a judge can try the core loop in one minute.
- [ ] **It works without Wispr installed:** typing into the same box gives the same result, so judges on any machine can try it.
- [ ] **Offline / cached demo mode:** if a free AI quota runs out, the demo still works and says so honestly.
- [ ] Works on a phone-width screen, at least for viewing.
- [ ] No broken buttons. Every button in the demo path does what it says.

### 4. Demo clear (15%)

- [ ] **At most 2:00** (target 1:50), unlisted YouTube, captions on.
- [ ] Order: problem → live use with Wispr → real result with a number → usage card → how to try it.
- [ ] The product is running on screen within the first 20 seconds.
- [ ] No slides, no long setup, no reading text aloud, no "one second".
- [ ] Anyone (not only developers) can follow it.

## How we keep it fair (official list)

1. "The criteria and weights above are fixed before the challenge starts."
2. "Every project is scored by multiple judges, and your final score is the average."
3. "Every judge's score for every project is public on the leaderboard."
4. "Every project gets written comments from the judges on how it could improve."
5. "Judges do not score a project they have a connection to."
6. "Scores are published on Wednesday 4 November, before winners are confirmed. If you think something was missed, you can raise it until the end of Thursday 5 November and you will get a written reply."
7. "Winners' Wispr accounts are verified with Wispr before prizes are sent."

The leaderboard "has three views: Projects, with every judge's score and comments, Wispr usage, with words dictated during the challenge, and Social, with everyone's posts."

## The judges

"The team from Wispr Flow and WeMakeDevs, scoring every submission against the same criteria."

| Judge | Role (as listed) | What they will likely look for |
|---|---|---|
| Kunal Kushwaha | Founder, WeMakeDevs | A clear story, real use, a clean public repo |
| Rohan Kochhar | India Growth, Wispr Flow | Voice that is natural, not forced; real Wispr usage; a workflow people would share |
| Aayush Sharma | COO, WeMakeDevs | Does it work, is the submission complete |
| Sachin Sharma | CMO, WeMakeDevs | Is the demo and the posts easy to follow and share |

(The third column is my guess from their roles, not official.)

## The two bonus prizes

Official: "The Most Wispr usage and Social prizes are ranked on their own. Wispr usage goes by words dictated during the challenge, and Social by how clearly a post shows a real workflow."

- **Most Wispr usage:** words dictated since 16 Oct, from the desktop usage card. Rank 1 on 6 Nov wins. Rank 1 had 2,91,673 words on 23 Oct, so we do not chase it.
- **Social:** posts with #NoHandsChallenge, tagging WeMakeDevs and Wispr Flow, linked in the weekly check-in. Ranked on "how clearly a post shows a real workflow". So every post shows a real before/after with a screen clip, not a promo (see SOCIAL.md).
