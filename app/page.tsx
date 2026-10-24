"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Interview } from "@/lib/bot";
import { newId, post, saveDraft } from "@/lib/store";

const STARTS = [
  {
    title: "Sales bot",
    note: "Sell my SaaS to free-plan users",
    brief:
      "I want a sales bot for Wispr Flow. It's a dictation app that turns your voice into clean text in any app. There's a free plan, Pro and Teams. The bot should call people who signed up for the free plan last week and get them to try Pro. It should speak Telugu, Hindi or English, whatever the customer speaks.",
  },
  {
    title: "Support bot",
    note: "Order status, refunds, handover",
    brief:
      "A support bot for my online saree shop. Customers call about where their order is, wrong size, and returns. Returns are allowed within 7 days if the tag is on. The bot should never promise a refund itself; a human approves refunds. Mostly Telugu and English callers.",
  },
  {
    title: "Daily brief caller",
    note: "Calls me at 10 am with my day",
    brief:
      "A bot that calls me every morning at 10 and tells me my day in two minutes: my meetings, the top three tasks, and any job applications I need to follow up on. Talk to me in English with a bit of Telugu, keep it short, and ask if I want to move anything.",
  },
];

export default function Describe() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function build() {
    setBusy(true);
    setError("");
    try {
      const { interview } = await post<{ interview: Interview }>("/api/interview", { brief });
      const id = newId();
      saveDraft({ id, brief, interview, answers: [], updated: 0 });
      router.push(`/b/${id}/interview`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <h1>What voice bot do you want to build?</h1>
      <p className="sub">
        Click the box, hold <kbd>fn</kbd> and just talk, in English, Hindi, Telugu or a mix. Wispr Flow types it for
        you. Rehearse asks a few questions, then builds the bot: call flow, rules, knowledge and prompt. Typing works too.
      </p>
      <div className="card">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. A bot that calls people who signed up for our free plan and gets them to try Pro. It should speak Telugu, Hindi or English…"
          autoFocus
        />
        <div className="row">
          <button className="btn primary" onClick={build} disabled={busy || brief.trim().length < 10}>
            {busy ? <span className="dots">Reading your brief</span> : "Build it"}
          </button>
          {error ? <span className="err">{error}</span> : <small className="muted">{brief.trim().split(/\s+/).filter(Boolean).length} words</small>}
        </div>
      </div>
      <div className="starts">
        {STARTS.map((s) => (
          <button key={s.title} onClick={() => setBrief(s.brief)}>
            <b>{s.title}</b>
            <small>{s.note}</small>
          </button>
        ))}
      </div>
    </main>
  );
}
