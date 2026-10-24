"use client";
import type { Bot } from "@/lib/bot";

const W = 156, H = 54, GX = 84, GY = 36, PAD = 20;
type P = [number, number];
type Box = [number, number, number, number];
type Anchor = "start" | "middle" | "end";
const hit = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const inside = (p: P, r: Box) => p[0] > r[0] && p[0] < r[2] && p[1] > r[1] && p[1] < r[3];
// Points every few pixels along a polyline or a cubic curve, to test labels against the lines.
const line = (c: P[]) => c.slice(1).flatMap((q, k) => {
  const p = c[k], n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 5));
  return Array.from({ length: n + 1 }, (_, j): P => [p[0] + ((q[0] - p[0]) * j) / n, p[1] + ((q[1] - p[1]) * j) / n]);
});
const curve = ([x0, y0, x1, y1, x2, y2, x3, y3]: number[]) => Array.from({ length: 41 }, (_, j): P => {
  const t = j / 40, u = 1 - t;
  return [u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3];
});

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
  return { pos, w: PAD * 2 + cols.length * (W + GX) - GX };
}

type Props = {
  bot: Bot;
  lit?: string[];
  cur?: string;
  bad?: string;
  good?: string;
  chg?: string[];
  sel?: string[];
  mini?: boolean;
  onPick?: (id: string, add: boolean, dbl?: boolean) => void;
};

export function Flow({ bot, lit = [], cur, bad, good, chg = [], sel = [], mini, onPick }: Props) {
  const { pos, w } = layout(bot);
  const bottom = Math.max(...[...pos.values()].map((p) => p.y + H));
  const outs = new Map<string, number>();
  bot.flow.links.forEach((l) => outs.set(l.from, (outs.get(l.from) ?? 0) + ((pos.get(l.to)?.x ?? 0) > (pos.get(l.from)?.x ?? 0) ? 1 : 0)));
  const backIdx = new Map<number, number>();
  bot.flow.links.forEach((l, i) => {
    const a = pos.get(l.from), b = pos.get(l.to);
    if (a && b && b.x <= a.x) backIdx.set(i, backIdx.size);
  });
  const h = bottom + (backIdx.size ? 30 + backIdx.size * 20 : 0) + PAD;
  const num = new Map(bot.flow.steps.map((s, i) => [s.id, i + 1]));
  const litEdge = (a: string, b: string) => {
    const i = lit.indexOf(a);
    return i >= 0 && lit[i + 1] === b;
  };
  const edges = bot.flow.links.flatMap((l, i) => {
    const a = pos.get(l.from), b = pos.get(l.to);
    if (!a || !b) return [];
    const back = b.x < a.x;
    let d: string, pts: P[], mx: number, my: number, anchor: Anchor;
    if (b.x === a.x) {
      // Same column: a short straight link between the two boxes, label beside it.
      const x = a.x + W - 26, y1 = b.y > a.y ? a.y + H : a.y, y2 = b.y > a.y ? b.y - 4 : b.y + H + 4;
      d = `M${x} ${y1} V${y2}`;
      pts = line([[x, y1], [x, y2]]);
      [mx, my, anchor] = [x - 6, (y1 + y2) / 2 + 4, "end"];
    } else if (back) {
      // Loops and backward links run in their own lane under the whole flow, so they never cross a box.
      // A box under the source in its column? Leave from the right side instead, so the line never runs through it.
      const lane = bottom + 22 + backIdx.get(i)! * 20, x2 = b.x + W / 2 + 14;
      const under = [...pos.values()].some((p) => p.x === a.x && p.y > a.y);
      const out: P[] = under ? [[a.x + W, a.y + H / 2], [a.x + W + 16, a.y + H / 2], [a.x + W + 16, lane]] : [[a.x + W / 2, a.y + H], [a.x + W / 2, lane]];
      const all: P[] = [...out, [x2, lane], [x2, b.y + H + 6]];
      d = "M" + all.map((p) => p.join(" ")).join(" L");
      pts = line(all);
      [mx, my, anchor] = [(a.x + b.x + W) / 2 + 7, lane - 5, "middle"];
    } else {
      const c = [a.x + W, a.y + H / 2, a.x + W + GX / 2, a.y + H / 2, b.x - GX / 2, b.y + H / 2, b.x - 4, b.y + H / 2];
      d = `M${c[0]} ${c[1]} C${c[2]} ${c[3]} ${c[4]} ${c[5]} ${c[6]} ${c[7]}`;
      pts = curve(c);
      // Several links leave this box: label each at its own target, where they are apart.
      [mx, my, anchor] = outs.get(l.from)! > 1 ? [b.x - 14, b.y + H / 2 - 9, "end"] : [a.x + W + 8, a.y + H / 2 - 7, "start"];
    }
    const max = b.x === a.x ? 18 : back ? 22 : 14;
    const tag = l.when.length > max ? l.when.slice(0, max - 1) + "…" : l.when;
    return [{ i, l, d, pts, mx, my, anchor, tag }];
  });
  // Place each label where it covers no box, no other label and no other line: try the spot by
  // its line first, then step up and down. ponytail: greedy; fine for a few dozen labels.
  const boxes: Box[] = [...pos.values()].map((p) => [p.x - 2, p.y - 2, p.x + W + 2, p.y + H + 2]);
  const labels: { i: number; x: number; y: number; anchor: Anchor; tag: string; when: string }[] = [];
  for (const e of edges) {
    if (e.l.when === "always") continue;
    const w = e.tag.length * 7.3 + 4;
    const at = (x: number, y: number): Box => {
      const x0 = e.anchor === "start" ? x - 2 : e.anchor === "end" ? x - w + 2 : x - w / 2;
      return [x0, y - 12, x0 + w, y + 4];
    };
    const other = [...edges.filter((o) => o !== e).flatMap((o) => o.pts), ...e.pts.slice(-4)]; // and its own arrowhead
    let best = { x: e.mx, y: e.my, cost: Infinity };
    for (const dy of [0, -14, 14, -28, 28, -42, 42]) {
      const r = at(e.mx, e.my + dy);
      const cost = boxes.filter((b) => hit(r, b)).length * 100 + other.filter((p) => inside(p, r)).length * 5 + Math.abs(dy) / 100;
      if (cost < best.cost) best = { x: e.mx, y: e.my + dy, cost };
      if (cost < 1) break;
    }
    boxes.push(at(best.x, best.y));
    labels.push({ i: e.i, x: best.x, y: best.y, anchor: e.anchor, tag: e.tag, when: e.l.when });
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMin meet" role="img" aria-label="Call flow" style={mini ? { maxHeight: 230 } : undefined}>
      <defs>
        <marker id="mk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--line)" />
        </marker>
        <marker id="mkA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--accent)" />
        </marker>
      </defs>
      {edges.map((e) => (
        <path key={e.i} d={e.d} className={`e ${litEdge(e.l.from, e.l.to) ? "lit" : ""}`} style={{ ["--d" as string]: `${0.15 + e.i * 0.06}s` }} />
      ))}
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
          sel.includes(s.id) && "sel",
        ].filter(Boolean).join(" ");
        const label = s.label.length > 18 ? s.label.slice(0, 17) + "…" : s.label;
        return (
          <g key={s.id} className={cls} style={{ ["--d" as string]: `${i * 0.07}s` }} onClick={(e) => onPick?.(s.id, e.shiftKey || e.metaKey)} onDoubleClick={() => onPick?.(s.id, true, true)}>
            <title>{s.says}</title>
            <rect className="halo" x={p.x} y={p.y} width={W} height={H} rx={16} />
            <rect className="bx" x={p.x} y={p.y} width={W} height={H} rx={16} />
            <circle className="nb2" cx={p.x + 18} cy={p.y + H / 2} r={11} />
            <text className="nt" x={p.x + 18} y={p.y + H / 2 + 4}>{num.get(s.id)}</text>
            <text className="t" x={p.x + W / 2 + 11} y={p.y + H / 2 + 5} style={label.length > 14 ? { fontSize: 13 } : undefined}>{label}</text>
          </g>
        );
      })}
      {!mini && labels.map((t) => (
        <text key={t.i} x={t.x} y={t.y} className="el" style={{ textAnchor: t.anchor, ["--d" as string]: `${0.3 + t.i * 0.06}s` }}>
          <title>{t.when}</title>
          {t.tag}
        </text>
      ))}
    </svg>
  );
}
