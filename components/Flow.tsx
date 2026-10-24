"use client";
import type { Bot } from "@/lib/bot";

const W = 168, H = 56, GX = 64, GY = 30, PAD = 24;

// Layered layout: column = distance from the start step, row = order within that column.
// ponytail: no crossing reduction; fine for the 5-10 steps a bot has, use dagre if flows grow.
function layout(bot: Bot) {
  const steps = bot.flow.steps;
  const start = steps.find((s) => s.kind === "start")?.id ?? steps[0].id;
  const depth = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!;
    for (const l of bot.flow.links)
      if (l.from === id && !depth.has(l.to)) {
        depth.set(l.to, depth.get(id)! + 1);
        queue.push(l.to);
      }
  }
  const max = Math.max(0, ...depth.values());
  steps.forEach((s) => depth.has(s.id) || depth.set(s.id, max + 1));
  const cols: string[][] = [];
  steps.forEach((s) => (cols[depth.get(s.id)!] ??= []).push(s.id));
  const tall = Math.max(...cols.map((c) => c?.length ?? 0));
  const pos = new Map<string, { x: number; y: number }>();
  cols.forEach((c, d) =>
    c?.forEach((id, r) => {
      const off = ((tall - c.length) * (H + GY)) / 2;
      pos.set(id, { x: PAD + d * (W + GX), y: PAD + 16 + off + r * (H + GY) });
    }),
  );
  return { pos, w: PAD * 2 + cols.length * (W + GX) - GX, h: PAD * 2 + 32 + tall * (H + GY) - GY };
}

type Props = {
  bot: Bot;
  lit?: string[];
  cur?: string;
  bad?: string;
  good?: string;
  chg?: string[];
  sel?: string;
  mini?: boolean;
  onPick?: (id: string) => void;
};

export function Flow({ bot, lit = [], cur, bad, good, chg = [], sel, mini, onPick }: Props) {
  const { pos, w, h } = layout(bot);
  const num = new Map(bot.flow.steps.map((s, i) => [s.id, i + 1]));
  const litEdge = (a: string, b: string) => {
    const i = lit.indexOf(a);
    return i >= 0 && lit[i + 1] === b;
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Call flow" style={mini ? { maxHeight: 190 } : undefined}>
      <defs>
        <marker id="mk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--line)" />
        </marker>
        <marker id="mkA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--accent)" />
        </marker>
      </defs>
      {bot.flow.links.map((l, i) => {
        const a = pos.get(l.from), b = pos.get(l.to);
        if (!a || !b) return null;
        const back = b.x <= a.x;
        const d = back
          ? `M${a.x + W / 2} ${a.y + H} C${a.x + W / 2} ${a.y + H + 60} ${b.x + W / 2} ${b.y + H + 60} ${b.x + W / 2} ${b.y + H + 4}`
          : `M${a.x + W} ${a.y + H / 2} C${a.x + W + GX / 2} ${a.y + H / 2} ${b.x - GX / 2} ${b.y + H / 2} ${b.x - 4} ${b.y + H / 2}`;
        const mx = back ? (a.x + b.x) / 2 + W / 2 : (a.x + W + b.x) / 2;
        const my = back ? Math.max(a.y, b.y) + H + 44 : (a.y + b.y) / 2 + H / 2 - 6;
        return (
          <g key={i}>
            <path d={d} className={`e ${litEdge(l.from, l.to) ? "lit" : ""}`} style={{ ["--d" as string]: `${0.15 + i * 0.06}s` }} />
            {!mini && l.when !== "always" && (
              <text x={mx} y={my} className="el" style={{ ["--d" as string]: `${0.3 + i * 0.06}s` }}>
                {l.when.slice(0, 22)}
              </text>
            )}
          </g>
        );
      })}
      {bot.flow.steps.map((s, i) => {
        const p = pos.get(s.id)!;
        const cls = [
          "n",
          s.kind === "end" && "end",
          lit.includes(s.id) && "lit",
          cur === s.id && "cur",
          chg.includes(s.id) && "chg",
          good === s.id && "good",
          bad === s.id && "bad",
          sel === s.id && "sel",
        ].filter(Boolean).join(" ");
        const label = s.label.length > 21 ? s.label.slice(0, 20) + "…" : s.label;
        return (
          <g key={s.id} className={cls} style={{ ["--d" as string]: `${i * 0.07}s` }} onClick={() => onPick?.(s.id)}>
            <title>{s.says}</title>
            <rect className="halo" x={p.x} y={p.y} width={W} height={H} rx={16} />
            <rect className="bx" x={p.x} y={p.y} width={W} height={H} rx={16} />
            <circle className="nb2" cx={p.x + 20} cy={p.y + H / 2} r={11} />
            <text className="nt" x={p.x + 20} y={p.y + H / 2 + 4}>{num.get(s.id)}</text>
            <text className="t" x={p.x + W / 2 + 12} y={p.y + H / 2 + 5}>{label}</text>
          </g>
        );
      })}
    </svg>
  );
}
