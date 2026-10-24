"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { langName } from "@/lib/bot";
import { listDrafts, type Draft } from "@/lib/store";

export default function MyBots() {
  const [bots, setBots] = useState<Draft[]>([]);
  useEffect(() => setBots(listDrafts()), []);
  return (
    <main className="page">
      <h1>My bots</h1>
      <p className="sub">Saved in this browser only. No sign-in.</p>
      {bots.length === 0 && <p className="muted">No bots yet. <Link href="/">Build one</Link>.</p>}
      <div className="steps">
        {bots.map((d) => (
          <Link key={d.id} href={d.bot ? `/b/${d.id}` : `/b/${d.id}/interview`} className="card" style={{ textDecoration: "none" }}>
            <h3>{d.bot?.name ?? d.interview?.name ?? "Untitled bot"}</h3>
            <span className="chip ok">{d.bot ? `v${d.bot.version}` : "interview"}</span>
            {(d.bot?.languages ?? d.interview?.understood.languages ?? []).map((l) => <span className="chip" key={l}>{langName(l)}</span>)}
          </Link>
        ))}
      </div>
    </main>
  );
}
