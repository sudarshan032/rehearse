# Submission form: what to put in each field

Form: https://www.wemakedevs.org/wispr/submit (needs sign-in). Deadline **Sat 31 Oct, 11:59 pm IST**. **No editing after submitting: submit once, when everything is final.**
**The real form (read out by Siddhu on 24 Oct, signed in; all fields required):** "Submit Project" opens a separate page with two parts.

| Part | Field | Type |
|---|---|---|
| 1. Project details | Project title | text |
| | Track | choice: "Builders, for developers" / "No-code, for every other role" |
| | Demo video link | URL (YouTube) |
| | Link to your working project | URL ("if you have built a project and want the judges to check it out") |
| | About the project | text: "a few lines on the problem, who it is for, and how you used Wispr Flow" |
| 2. How you used Wispr Flow | Usage card | image upload (from the Wispr Flow app, Insights) |
| | Feedback on Wispr Flow | text: how you use it and how you feel about it |

There is **no separate repo field** and **no separate "how you used Wispr" text box**: the Wispr story must fit inside "About the project".
The form cannot be edited after submitting. **We submit on 30 Oct; 31 Oct is the spare day.**

Field notes below as first drafted (sections 6 is folded into 5). The official wording below comes from the main page "What you submit" section,
the sample submission, the FAQ and the blog ([snapshots](official/)).

Official list: "A link to your working project." / "A demo video of up to two minutes." /
"Your Wispr usage card, as a screenshot from Insights in the desktop app." /
"A few lines on the problem, who it is for and how you used Wispr."

## The quality bar: official sample submission "Call to Follow-up"

Copied from the main page (Track 2: No-Code, Sales):

> **01 Project link** — callfollowup.lovable.app
> Opens without signing in. Sample call notes sit on the first screen, so a judge can try it in a minute.
>
> **02 Demo video** — 1:52, unlisted on YouTube
> A real call ends, I hold Fn and say what happened, and the email and the CRM note appear. I dictate two fixes and send.
>
> **03 Wispr usage card** — Insights screenshot, 21,480 words
> Words dictated from 16 to 31 October.
>
> **04 About the project** — Problem, user, and how Wispr was used
> I sell to clinics, and after every call I lose half an hour writing the follow-up and updating the CRM. This is for reps on back-to-back calls. I built it in Lovable by talking through each screen with Wispr Flow, then tested it on my notes from 14 real calls. It now drafts both in under a minute.

What makes it good: one sentence each, a real number in every block (1:52, 21,480 words, 14 real calls, half an hour → under a minute), and the judge knows exactly what to click.

## Fields

### 1. Project title
- **Official ask:** not stated. The sample uses a plain name that says what it does ("Call to Follow-up").
- **Length:** 1 to 4 words, the same as the repo name and the product name on the page.
- [ ] Same name in repo, live site header, README title, video title and posts
- [ ] Says what it does, no jargon
- [ ] Does not clash with another entry's name (check COMPETITION.md; "Debrief" is taken)

### 2. Track
- **Official ask:** "Pick one track, Builders or No-Code, and submit one project in it."
- **Ours:** Builders (we write code by directing Claude Code).
- [ ] Builders selected
- [ ] README says "Builders track" once, near the top

### 3. Demo video link
- **Official ask:** "A demo video of up to two minutes." Sample: "1:52, unlisted on YouTube". Blog: include "a short clip of Flow in use".
- **Length:** 1:40 to 1:55. Never over 2:00.
- [ ] Unlisted YouTube link, opens in a private window
- [ ] Length checked in the YouTube player (≤ 2:00)
- [ ] Captions on (auto captions checked for wrong words)
- [ ] Follows DEMO.md shot list: problem, live use, real number, Flow clip, usage card, how to try it

### 4. Link to the working project
- **Official ask:** "A link to your working project." Sample: "Opens without signing in. Sample call notes sit on the first screen, so a judge can try it in a minute." FAQ: "Judges need to try it without paying or asking you for access … if it needs a sign-in, put a test login and sample input in your description."
- **Length:** one URL + one line on what to click.
- [ ] Opens in a private window with no sign-in, no key
- [ ] Sample data on the first screen
- [ ] Core loop works by typing too (judges may not have Wispr)
- [ ] Cached/offline mode works with the AI turned off
- [ ] Loads in under 3 s (no cold-start host for the page itself)
- [ ] Checked from a phone too
- [ ] The GitHub repo link is in the README and in "About the project" (the form has no repo field)

### 5. About the project
- **Official ask:** "A few lines on the problem, who it is for and how you used Wispr." Form: "a few lines on the problem, who it is for, and how you used Wispr Flow".
- **Length:** 80 to 120 words, 5 sentences, like the sample. Must also carry the repo link (no repo field).
- Template:
  1. Problem in my work + how often + what it costs: "Every week I … and it takes …"
  2. Who it is for: "This is for … who …"
  3. How I built it: "I built it by dictating … into Claude Code with Wispr Flow."
  4. Real result with a number: "I used it on … real … from 24 to 29 Oct; it now … in … instead of …"
- [ ] Every sentence has a fact; at least two numbers
- [ ] No buzzwords ("revolutionary", "AI-powered platform")
- [ ] Dictated with Wispr, then checked

### 6. How you used Wispr Flow (not a separate field: put this inside 5, short)
- **Official ask:** judges page: "Flow is part of the build and the workflow, and your demo and usage card show it." FAQ: "Use your voice for as much as you can: prompts, docs, messages and commit notes … Judges look at how much of your writing went through Flow."
- **Length:** 60 to 100 words, two short parts.
- Template:
  - **In the build:** what I dictated (every Claude Code prompt, specs, README, commit messages, posts), total words from the card, and the biggest single dictation.
  - **In the product:** the main input is made for speaking; why voice beats typing for this task in one line.
- [ ] Numbers from the usage card and `docs/voice-log.md`, never guessed
- [ ] Says what was still typed (shortcuts, small fixes), honestly

### 7. Wispr Flow usage card screenshot
- **Official ask:** "Your Wispr usage card, as a screenshot from Insights in the desktop app." Sample: "Insights screenshot, 21,480 words. Words dictated from 16 to 30 October."
- **Length:** one PNG.
- [ ] Taken right before submitting (it cannot be updated afterwards)
- [ ] From Wispr Flow desktop app > Insights > Your usage
- [ ] Nothing private visible (crop out email if shown)
- [ ] Same image in the README and the last 15 s of the video

### 8. Feedback on Wispr Flow
- **Official ask:** not stated on the public pages.
- **Length:** 50 to 100 words. Honest and specific.
- Template: one thing that worked very well (with an example), one thing that went wrong (with an example, e.g. a technical word it misheard), one feature request.
- [ ] Real examples from `docs/voice-log.md`
- [ ] Polite, specific, no marketing tone

## Final check before pressing Submit (30 Oct)

- [ ] All 8 fields filled, read aloud once
- [ ] Live link + video opened in a private window
- [ ] README first screen matches README_TEMPLATE.md
- [ ] Repo public, no secrets (`git log -p | grep -i key` is clean), no files dated before the start
- [ ] Screenshot of the filled form saved in `docs/submission-proof.png` (do not commit personal data)
