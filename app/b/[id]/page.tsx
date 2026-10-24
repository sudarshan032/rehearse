"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { langName, TOOL_SHELF, type Bot } from "@/lib/bot";
import { getDraft } from "@/lib/store";

const TABS = ["Flow", "Rules", "Knowledge", "Prompt", "Stack & speed"] as const;

function download(bot: Bot) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(bot, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${bot.name.replace(/\W+/g, "-").toLowerCase()}.json` });
  a.click();
  URL.revokeObjectURL(url);
}

export default function BotPage() {
  const { id } = useParams<{ id: string }>();
  const [bot, setBot] = useState<Bot | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Flow");

  useEffect(() => setBot(getDraft(id)?.bot ?? null), [id]);
  if (!bot) return <main className="page muted">Loading…</main>;

  const label = (sid: string) => bot.flow.steps.find((s) => s.id === sid)?.label ?? sid;
  const source = (s: string) => (s === "suggested" ? "suggested by the builder" : s === "brief" ? "from your brief" : `from your answer to ${s.toUpperCase()}`);

  return (
    <main className="page">
      <div className="row" style={{ marginTop: 0, justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>{bot.name}</h1>
          <span className="chip ok">{bot.type}</span>
          {bot.languages.map((l) => <span className="chip" key={l}>{langName(l)}</span>)}
          <span className="chip">v{bot.version}</span>
        </div>
        <button className="btn" onClick={() => download(bot)}>Export JSON</button>
      </div>
      <p className="sub" style={{ marginTop: 10 }}>{bot.goal}</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "Flow" && (
        <div className="steps">
          {bot.flow.steps.map((s, i) => {
            const out = bot.flow.links.filter((l) => l.from === s.id);
            return (
              <div className={`step ${s.kind}`} key={s.id}>
                <span className="n">{i + 1}</span>
                <div>
                  <h3>{s.label}</h3>
                  <p className="says">“{s.says}”</p>
                  {out.length > 0 && <div className="next">→ {out.map((l) => `${label(l.to)} (${l.when})`).join("  ·  ")}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Rules" && (
        <div className="card">
          {bot.rules.map((r) => (
            <div className="rule" key={r.id}>
              <span className={`ic ${r.kind}`}>{r.kind === "never" ? "✕" : "✓"}</span>
              <div>
                <b>{r.kind === "never" ? "Never" : "Always"}:</b> {r.text}
                <small>{source(r.source)}{r.suggested ? " · keep or remove" : ""}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Knowledge" && (
        <div className="card">
          {bot.knowledge.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>{bot.knowledge.map((k) => <li key={k.id}>{k.text}</li>)}</ul>
          ) : (
            <p className="muted">No facts yet. Tell the builder about your product, prices or policies.</p>
          )}
          {bot.tools.some((t) => t.enabled) && (
            <>
              <h3 style={{ marginTop: 16 }}>Tools</h3>
              {bot.tools.filter((t) => t.enabled).map((t) => <span className="chip" key={t.id}>{TOOL_SHELF[t.id] ?? t.id}</span>)}
            </>
          )}
        </div>
      )}

      {tab === "Prompt" && <pre className="prompt">{bot.prompt}</pre>}

      {tab === "Stack & speed" && (
        <>
          <div className="stack">
            <div className="card"><small>Hears</small><b>Deepgram nova-3</b><p className="muted">Mixed Telugu, Hindi, English</p></div>
            <div className="card"><small>Thinks</small><b>{bot.stack.llm.replace(/^\w+:/, "")}</b><p className="muted">{bot.stack.llm.split(":")[0]} free tier</p></div>
            <div className="card"><small>Speaks</small><b>Murf Falcon 2.1</b><p className="muted">Voice: {bot.persona.voice.lang}</p></div>
          </div>
          <p className="muted">Real reply times show up here after a Voice test.</p>
        </>
      )}
    </main>
  );
}
