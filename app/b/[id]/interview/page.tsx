"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { langName, TOOL_SHELF, type Bot, type Interview } from "@/lib/bot";
import { getDraft, post, saveDraft, type Draft } from "@/lib/store";

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setDraft(getDraft(id) ?? null), [id]);

  if (!draft?.interview) return <main className="page muted">Loading…</main>;
  const { interview, answers } = draft;
  const answer = (qid: string) => answers.find((a) => a.id === qid)?.a ?? "";

  function setAnswer(qid: string, q: string, a: string) {
    const next = { ...draft!, answers: [...answers.filter((x) => x.id !== qid), { id: qid, q, a }] };
    setDraft(next);
    saveDraft(next);
  }

  async function run(kind: "more" | "build") {
    setBusy(kind);
    setError("");
    const all = interview.questions.map((q) => ({ id: q.id, q: q.q, a: answer(q.id) }));
    try {
      if (kind === "more") {
        const { interview: next } = await post<{ interview: Interview }>("/api/interview", { brief: draft!.brief, answers: all });
        const offset = interview.questions.length;
        const more = next.questions.map((q, i) => ({ ...q, id: `q${offset + i + 1}` }));
        const d = { ...draft!, interview: { ...next, questions: [...interview.questions, ...more].slice(0, 12) } };
        setDraft(d);
        saveDraft(d);
      } else {
        const { bot } = await post<{ bot: Bot }>("/api/blueprint", { id, brief: draft!.brief, answers: all });
        saveDraft({ ...draft!, bot });
        router.push(`/b/${id}`);
        return;
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy("");
  }

  const u = interview.understood;
  return (
    <main className="page">
      <h1>A few questions about “{interview.name}”</h1>
      <p className="sub">
        Answer by voice (hold <kbd>fn</kbd>) or typing. Skip anything; the builder will pick a sensible default.
      </p>
      <div className="two">
        <div>
          {interview.questions.map((q, i) => (
            <div className="q" key={q.id}>
              <label htmlFor={q.id}>
                {i + 1}. {q.q}
              </label>
              <textarea
                id={q.id}
                className="small"
                placeholder={q.hint}
                value={answer(q.id)}
                onChange={(e) => setAnswer(q.id, q.q, e.target.value)}
              />
            </div>
          ))}
          <div className="row">
            <button className="btn primary" onClick={() => run("build")} disabled={!!busy}>
              {busy === "build" ? <span className="dots">Drawing the call flow</span> : "Build my bot"}
            </button>
            <button className="btn" onClick={() => run("more")} disabled={!!busy || interview.questions.length >= 12}>
              {busy === "more" ? <span className="dots">Thinking</span> : "Ask me more"}
            </button>
            {error && <span className="err">{error}</span>}
          </div>
        </div>
        <aside className="card sticky">
          <h2>What I understood</h2>
          <dl className="spec">
            <dt>Type</dt>
            <dd>
              <span className="chip ok">{interview.type}</span>
            </dd>
            <dt>Goal</dt>
            <dd>{u.goal || <span className="muted">not clear yet</span>}</dd>
            <dt>Who gets the call</dt>
            <dd>{u.callers || <span className="muted">not clear yet</span>}</dd>
            <dt>Languages</dt>
            <dd>{u.languages.map((l) => <span className="chip" key={l}>{langName(l)}</span>)}</dd>
            {u.knowledge.length > 0 && (<><dt>Knows</dt><dd><ul>{u.knowledge.map((k) => <li key={k}>{k}</li>)}</ul></dd></>)}
            {u.never.length > 0 && (<><dt>Never</dt><dd><ul>{u.never.map((k) => <li key={k}>{k}</li>)}</ul></dd></>)}
            {u.always.length > 0 && (<><dt>Always</dt><dd><ul>{u.always.map((k) => <li key={k}>{k}</li>)}</ul></dd></>)}
            {u.tools.length > 0 && (<><dt>Tools</dt><dd>{u.tools.map((t) => <span className="chip" key={t}>{TOOL_SHELF[t] ?? t}</span>)}</dd></>)}
          </dl>
        </aside>
      </div>
    </main>
  );
}
