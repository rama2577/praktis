"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ActivityItem,
  ConfidenceBucket,
  ExceptionInsight,
  IndustryBreakdownItem,
  PipelineData,
  SlaStageSummary,
  WeeklyTrendPoint,
} from "@/server/dashboard";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";

const POLL_MS = 30_000;

type OpsData = {
  pipeline: PipelineData;
  sla: SlaStageSummary[];
  confidence: ConfidenceBucket[];
  activity: ActivityItem[];
  industry: IndustryBreakdownItem[];
  trend: WeeklyTrendPoint[];
  insights: ExceptionInsight[];
};

// ── Pipeline 5 stage ─────────────────────────────────────────────────────

const STAGE_STYLE: Record<string, { box: string; label: string }> = {
  draft: { box: "border-slate-300 bg-slate-100", label: "text-slate-800" },
  ruleEngine: { box: "border-yellow-400/30 bg-yellow-400/5", label: "text-amber-600" },
  junior: { box: "border-amber-500/30 bg-amber-500/5", label: "text-amber-600" },
  senior: { box: "border-yellow-400/30 bg-yellow-400/5", label: "text-amber-600" },
  tax: { box: "border-sky-500/30 bg-sky-500/5", label: "text-sky-600" },
};

function PipelineViz({ data }: { data: PipelineData }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {data.stages.map((stage, i) => {
        const style = STAGE_STYLE[stage.key] ?? STAGE_STYLE.draft;
        return (
          <div key={stage.key} className="flex items-center gap-2">
            <Link
              href="/dashboard/queues"
              title={`Lihat antrian — ${stage.label}`}
              className={`min-w-[9.5rem] flex-1 rounded-xl border p-4 transition hover:border-slate-500 ${style.box}`}
            >
              <p className={`text-xs font-medium uppercase tracking-wider ${style.label}`}>{stage.label}</p>
              <p className="mt-1.5 text-3xl font-semibold tabular-nums text-slate-900">{stage.count}</p>
              <p className="mt-1 truncate text-[11px] text-slate-700">{stage.hint}</p>
            </Link>
            {i < data.stages.length - 1 && (
              <span aria-hidden className="text-slate-700">
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReviewQueues({ data }: { data: PipelineData }) {
  const QUEUE_TONE: Record<string, "warning" | "accent" | "neutral" | "danger"> = {
    JUNIOR: "warning",
    SENIOR: "accent",
    TAX: "neutral",
    PARTNER: "danger",
  };
  const QUEUE_LABEL: Record<string, string> = {
    JUNIOR: "Review Junior",
    SENIOR: "Review Senior",
    TAX: "Review Pajak",
    PARTNER: "Persetujuan Partner",
  };
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {data.queues.length === 0 ? (
        <p className="bg-card/40 p-5 text-sm text-slate-700">Tidak ada antrian pending.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.queues.map((q) => (
            <li key={q.stage}>
              <Link
                href="/dashboard/queues"
                className="flex items-center justify-between gap-3 bg-card/40 px-4 py-3 transition hover:bg-black/5"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge label={QUEUE_LABEL[q.stage]} tone={QUEUE_TONE[q.stage] ?? "neutral"} />
                  {q.urgent > 0 && <StatusBadge label={`${q.urgent} urgent`} tone="danger" />}
                </div>
                <span className="text-sm tabular-nums text-slate-800">{q.pending} menunggu</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── SLA bars ─────────────────────────────────────────────────────────────

const SLA_ORDER: Array<{ key: SlaStageSummary["stage"]; label: string; target: string }> = [
  { key: "JUNIOR", label: "Review Junior", target: "≤ 2 jam" },
  { key: "SENIOR", label: "Review Senior", target: "≤ 4 jam" },
  { key: "TAX", label: "Review Pajak", target: "≤ 4 jam" },
  { key: "PARTNER", label: "Persetujuan Partner", target: "≤ 2 jam" },
];

function slaTone(s: SlaStageSummary): "bg-emerald-500" | "bg-amber-400" | "bg-red-500" {
  if (s.breached > 0 || s.overdue > 0) return "bg-red-500";
  if (s.avgPct >= 80) return "bg-amber-400";
  return "bg-emerald-500";
}

function SlaPanel({ data }: { data: SlaStageSummary[] }) {
  return (
    <div className="space-y-3">
      {SLA_ORDER.map((row) => {
        const s = data.find((d) => d.stage === row.key);
        if (!s) return null;
        const pct = Math.min(100, s.avgPct);
        const tone = slaTone(s);
        return (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-700">
                {row.label} <span className="text-xs text-slate-700">({row.target})</span>
              </span>
              <span className="tabular-nums text-xs text-slate-700">
                {s.pending > 0 ? `${s.pending} antre · ` : ""}
                {s.overdue > 0 ? `${s.overdue} terlambat · ` : ""}
                {s.completed} selesai ({s.met} OK / {s.breached} breach) · {s.avgPct.toLocaleString("id-ID")}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`animate-progress h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Confidence chart ─────────────────────────────────────────────────────

function ConfidenceChart({ data }: { data: ConfidenceBucket[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#1e2a45" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={{ stroke: "#1e2a45" }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(59,130,246,0.06)" }}
            contentStyle={{ background: "#0f172a", border: "1px solid #1e2a45", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(value) => [`${value} jurnal`, "Jumlah"]}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Activity feed ────────────────────────────────────────────────────────

function ActivityFeed({ data }: { data: ActivityItem[] }) {
  return (
    <ul className="space-y-0 divide-y divide-line">
      {data.length === 0 && <li className="py-4 text-sm text-slate-700">Belum ada aktivitas.</li>}
      {data.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-800">
              <span className="font-medium text-slate-900">{item.userName}</span> {item.label}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-700">{item.action}</p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-slate-700">
            {formatRelativeTime(item.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── EN-03: Quality Insights ──────────────────────────────────────────────

function QualityTrend({ data }: { data: WeeklyTrendPoint[] }) {
  if (data.length === 0) return <p className="text-xs text-slate-700">Belum ada data tren.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-slate-800">Tren Mingguan</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
          <XAxis dataKey="weekLabel" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} unit="%" />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#cbd5e1" }}
          />
          <Bar dataKey="exceptionRate" name="Exception %" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          <Bar dataKey="firstPassRate" name="First-Pass %" fill="#10b981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function QualityByIndustry({ data }: { data: IndustryBreakdownItem[] }) {
  if (data.length === 0) return <p className="text-xs text-slate-700">Belum ada data per industri.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-slate-800">Per Industri</h3>
      <div className="max-h-44 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-700">
              <th className="py-1.5 pr-2 font-medium">Industri</th>
              <th className="py-1.5 pr-2 font-medium text-right">Jurnal</th>
              <th className="py-1.5 pr-2 font-medium text-right">Exc %</th>
              <th className="py-1.5 font-medium text-right">FP %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.industry} className="border-b border-slate-200/60 last:border-0">
                <td className="py-1.5 pr-2 text-slate-800">{d.industry}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-slate-700">{d.totalJournals}</td>
                <td className={`py-1.5 pr-2 text-right tabular-nums ${d.exceptionRate > 30 ? "text-amber-600" : "text-slate-700"}`}>{d.exceptionRate}%</td>
                <td className={`py-1.5 text-right tabular-nums ${d.firstPassRate < 50 ? "text-red-600" : "text-emerald-600"}`}>{d.firstPassRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QualityExceptionInsights({ data }: { data: ExceptionInsight[] }) {
  if (data.length === 0) return <p className="text-xs text-slate-700">Belum ada pengecualian.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-slate-800">Alasan Pengecualian</h3>
      <div className="space-y-2">
        {data.map((d) => (
          <div
            key={d.flag}
            className="flex items-start justify-between gap-2 rounded-lg border border-slate-200/50 bg-slate-50/30 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs text-slate-700 truncate">{d.flag}</p>
              <p className="text-[10px] text-slate-700">
                terakhir {new Date(d.lastSeen).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-amber-600">
              {d.count}x
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel gabungan dengan polling ────────────────────────────────────────

/** EN-07 — Fokus section per role (urutan render dashboard). */
export type DashboardFocus = "junior" | "senior" | "tax" | "partner" | "admin";

const FOCUS_ORDER: Record<DashboardFocus, string[]> = {
  // Junior: antrian duluan (pekerjaan utamanya)
  junior: ["pipeline", "activity", "sla", "insight"],
  // Senior: SLA/kualitas duluan (exception & kepatuhan)
  senior: ["sla", "pipeline", "insight", "activity"],
  // Tax: pipeline (stage pajak) + SLA
  tax: ["pipeline", "sla", "insight", "activity"],
  // Partner: kepatuhan & tren duluan (KPI ringkas sudah di atas)
  partner: ["sla", "insight", "confidence", "pipeline", "activity"],
  admin: ["pipeline", "sla", "activity", "insight"],
};

export function DashboardPanels({
  initial,
  focus = "admin",
}: {
  initial: OpsData;
  focus?: DashboardFocus;
}) {
  const [data, setData] = useState<OpsData>(initial);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: OpsData };
      setData(json.data);
      setLastSync(new Date());
      setError(null);
    } catch {
      setError("Sinkronisasi gagal — data mungkin tertinggal.");
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const syncLabel = error ? (
    <button
      type="button"
      onClick={() => void refresh()}
      title="Coba sinkronisasi lagi"
      className="text-red-600 underline decoration-dotted hover:text-red-600"
    >
      {error} — Coba lagi
    </button>
  ) : (
    `auto-refresh · ${lastSync.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
  );

  const sections: Record<string, ReactNode> = {
    pipeline: (
      <Card>
        <CardHeader
          title="Pipeline Produksi"
          action={<span className="text-xs text-slate-700">{syncLabel}</span>}
        />
        <PipelineViz data={data.pipeline} />
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Antrian Review</h2>
            <Link href="/dashboard/queues" className="text-xs text-amber-600 hover:underline">
              Buka semua antrian →
            </Link>
          </div>
          <ReviewQueues data={data.pipeline} />
        </div>
      </Card>
    ),
    sla: (
      <Card className="lg:col-span-2">
        <CardHeader title="Monitoring SLA" />
        <SlaPanel data={data.sla} />
      </Card>
    ),
    confidence: (
      <Card>
        <CardHeader
          title="Distribusi Keyakinan AI"
          description="Skor confidence jurnal aktual"
        />
        <ConfidenceChart data={data.confidence} />
      </Card>
    ),
    activity: (
      <Card>
        <CardHeader title="Aktivitas Terbaru" />
        <ActivityFeed data={data.activity} />
      </Card>
    ),
    insight: (
      <Card className="border-emerald-500/20">
        <CardHeader
          title="Insight Kualitas (Feedback Loop)"
          description="Metrik real-time dari data operasional: exception rate, first-pass, tren mingguan, & alasan pengecualian."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <QualityTrend data={data.trend} />
          <QualityByIndustry data={data.industry} />
          <QualityExceptionInsights data={data.insights} />
        </div>
      </Card>
    ),
  };

  const order = FOCUS_ORDER[focus] ?? FOCUS_ORDER.admin;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {order.map((key) => {
          const node = sections[key];
          // SLA + Confidence berbagi grid 2+1; sisanya full-width
          const inGrid = key === "sla" || key === "confidence";
          return (
            <div key={key} className={inGrid ? "contents" : "lg:col-span-3"}>
              {node}
            </div>
          );
        })}
      </div>
    </div>
  );
}
