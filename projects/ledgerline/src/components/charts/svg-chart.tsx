/**
 * SVG chart components — zero dependency, lightweight, dark-mode native.
 * Supports: bar (horizontal/vertical), pie (donut), trend line.
 */

import { formatCurrencyRp } from "@/lib/format";

// ── Types ────────────────────────────────────────────────────────────────────

export type ChartItem = { label: string; value: number; color: string };

// ── Color palette ───────────────────────────────────────────────────────────

const COLORS = ["#f5c518", "#38bdf8", "#34d399", "#a78bfa", "#fb7185", "#f97316", "#2dd4bf", "#e879f9"];

// ── Donut/Ring Chart ────────────────────────────────────────────────────────

export function DonutChart({ data, title, size = 160 }: { data: ChartItem[]; title?: string; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart title={title} />;

  const cx = size / 2, cy = size / 2, r = size * 0.35, ringW = size * 0.07;
  const angle = (v: number) => (v / total) * Math.PI * 2;
  const polar = (a: number, rad: number) => ({ x: cx + rad * Math.sin(a), y: cy - rad * Math.cos(a) });

  let startAngle = -Math.PI / 2;
  const slices: { d: string; color: string; pct: number }[] = [];

  for (const d of data) {
    const a = angle(d.value);
    const endAngle = startAngle + a;
    const large = a > Math.PI ? 1 : 0;
    const rOuter = r + ringW / 2, rInner = r - ringW / 2;
    const s1 = polar(startAngle, rOuter);
    const s2 = polar(endAngle, rOuter);
    const s3 = polar(endAngle, rInner);
    const s4 = polar(startAngle, rInner);
    slices.push({
      d: `M${s1.x.toFixed(1)},${s1.y.toFixed(1)} A${rOuter},${rOuter} 0 ${large} 1 ${s2.x.toFixed(1)},${s2.y.toFixed(1)} L${s3.x.toFixed(1)},${s3.y.toFixed(1)} A${rInner},${rInner} 0 ${large} 0 ${s4.x.toFixed(1)},${s4.y.toFixed(1)} Z`,
      color: d.color,
      pct: (d.value / total) * 100,
    });
    startAngle = endAngle;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {title && <p className="text-xs font-medium text-slate-400">{title}</p>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} opacity={0.9} />)}
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-[10px]" fill="#f1f5f9">
          {formatCurrencyRp(total)}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="text-[8px]" fill="#64748b">TOTAL</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: d.color }} />
            {d.label} ({((d.value / total) * 100).toFixed(0)}%)
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal Bar Chart ────────────────────────────────────────────────────

export function HBarChart({ data, title, width = 360, height }: { data: ChartItem[]; title?: string; width?: number; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barH = 22, gap = 6, pad = { top: 10, bottom: 6, left: 100, right: 60 };
  const h = height ?? data.length * (barH + gap) + pad.top + pad.bottom;

  return (
    <div className="flex flex-col items-center gap-2">
      {title && <p className="text-xs font-medium text-slate-400">{title}</p>}
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} className="text-[10px]">
        {data.map((d, i) => {
          const y = pad.top + i * (barH + gap);
          const w = Math.max((d.value / max) * (width - pad.left - pad.right), 2);
          return (
            <g key={i}>
              <text x={pad.left - 4} y={y + barH / 2 + 3} textAnchor="end" fill="#94a3b8">{d.label}</text>
              <rect x={pad.left} y={y} width={w} height={barH} rx={2} fill={d.color} opacity={0.85} />
              <text x={pad.left + w + 4} y={y + barH / 2 + 3} fill="#cbd5e1">
                {formatCurrencyRp(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Vertical Bar Chart (pendapatan vs beban) ────────────────────────────────

export function VBarChart({ data, title, height = 120 }: { data: ChartItem[]; title?: string; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 40, gap = 16, pad = { top: 16, bottom: 32, left: 12, right: 12 };
  const w = data.length * (barW + gap) - gap + pad.left + pad.right;

  return (
    <div className="flex flex-col items-center gap-2">
      {title && <p className="text-xs font-medium text-slate-400">{title}</p>}
      <svg width={w} height={height + pad.top + pad.bottom} viewBox={`0 0 ${w} ${height + pad.top + pad.bottom}`} className="text-[10px]">
        {data.map((d, i) => {
          const x = pad.left + i * (barW + gap);
          const bh = Math.max((d.value / max) * height, 1);
          const y = pad.top + height - bh;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bh} rx={3} fill={d.color} opacity={0.85} />
              <text x={x + barW / 2} y={y + height - bh + 16} textAnchor="middle" fill="#94a3b8">{d.label}</text>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="#cbd5e1" className="text-[9px]">
                {formatCurrencyRp(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Mini Trend (sparkline-like) ─────────────────────────────────────────────

export function TrendChart({ data, title, height = 40, width = 200 }: { data: { period: string; value: number }[]; title?: string; height?: number; width?: number }) {
  if (data.length < 2) return <EmptyChart title={title} />;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const pad = { left: 4, right: 4, top: 4, bottom: 16 };

  const points = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * (width - pad.left - pad.right),
    y: pad.top + height - ((d.value - min) / range) * (height - pad.top - pad.bottom),
    ...d,
  }));

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const isUp = data[data.length - 1]!.value >= data[0]!.value;

  return (
    <div className="flex flex-col items-center gap-1">
      {title && <p className="text-xs font-medium text-slate-400">{title}</p>}
      <svg width={width} height={height + pad.top + pad.bottom} viewBox={`0 0 ${width} ${height + pad.top + pad.bottom}`} className="text-[9px]">
        <path d={lineD} fill="none" stroke={isUp ? "#34d399" : "#fb7185"} strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill={isUp ? "#34d399" : "#fb7185"} />
        ))}
        <text x={width / 2} y={height + pad.top + pad.bottom - 2} textAnchor="middle" fill="#64748b">
          {points[0]!.period} → {points[points.length - 1]!.period}
        </text>
      </svg>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyChart({ title }: { title?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      {title && <p className="text-xs font-medium text-slate-400">{title}</p>}
      <p className="text-xs text-slate-600">Data tidak tersedia</p>
    </div>
  );
}

// ── Auto-pick colors ────────────────────────────────────────────────────────

export function withColors(items: { label: string; value: number }[]): ChartItem[] {
  return items.map((it, i) => ({ ...it, color: COLORS[i % COLORS.length]! }));
}
