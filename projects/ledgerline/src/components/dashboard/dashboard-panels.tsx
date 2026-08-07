"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivityItem, ConfidenceBucket, PipelineData, SlaStageSummary } from "@/server/dashboard";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRelativeTime } from "@/lib/format";const POLL_MS = 30_000;

type OpsData = {
  pipeline: PipelineData;
  sla: SlaStageSummary[];
  confidence: ConfidenceBucket[];
  activity: ActivityItem[];
};

// ── Pipeline 5 stage ─────────────────────────────────────────────────────

const STAGE_STYLE: Record<string, { box: string; label: string }> = {
  draft: { box: "border-slate-600 bg-slate-800/50", label: "text-slate-200" },
  ruleEngine: { box: "border-yellow-400/30 bg-yellow-400/5", label: "text-yellow-400" },
  junior: { box: "border-amber-500/30 bg-amber-500/5", label: "text-amber-300" },
  senior: { box: "border-yellow-400/30 bg-yellow-400/5", label: "text-yellow-400" },
  tax: { box: "border-sky-500/30 bg-sky-500/5", label: "text-sky-300" },
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
              <p className="mt-1.5 text-3xl font-semibold tabular-nums text-slate-100">{stage.count}</p>
              <p className="mt-1 truncate text-[11px] text-slate-400">{stage.hint}</p>
            </Link>
            {i < data.stages.length - 1 && (
              <span aria-hidden className="text-slate-600">
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
        <p className="bg-card/40 p-5 text-sm text-slate-400">Tidak ada antrian pending.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.queues.map((q) => (
            <li key={q.stage}>
              <Link
                href="/dashboard/queues"
                className="flex items-center justify-between gap-3 bg-card/40 px-4 py-3 transition hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge label={QUEUE_LABEL[q.stage]} tone={QUEUE_TONE[q.stage] ?? "neutral"} />
                  {q.urgent > 0 && <StatusBadge label={`${q.urgent} urgent`} tone="danger" />}
                </div>
                <span className="text-sm tabular-nums text-slate-200">{q.pending} menunggu</span>
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
              <span className="text-slate-300">
                {row.label} <span className="text-xs text-slate-500">({row.target})</span>
              </span>
              <span className="tabular-nums text-xs text-slate-400">
                {s.pending > 0 ? `${s.pending} antre · ` : ""}
                {s.overdue > 0 ? `${s.overdue} terlambat · ` : ""}
                {s.completed} selesai ({s.met} OK / {s.breached} breach) · {s.avgPct.toLocaleString("id-ID")}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
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
            cursor={{ fill: "rgba(245,197,24,0.06)" }}
            contentStyle={{ background: "#0f172a", border: "1px solid #1e2a45", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(value) => [`${value} jurnal`, "Jumlah"]}
          />
          <Bar dataKey="count" fill="#f5c518" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Activity feed ────────────────────────────────────────────────────────

function ActivityFeed({ data }: { data: ActivityItem[] }) {
  return (
    <ul className="space-y-0 divide-y divide-line">
      {data.length === 0 && <li className="py-4 text-sm text-slate-400">Belum ada aktivitas.</li>}
      {data.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-200">
              <span className="font-medium text-slate-100">{item.userName}</span> {item.label}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500">{item.action}</p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-slate-500">
            {formatRelativeTime(item.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Panel gabungan dengan polling ────────────────────────────────────────

export function DashboardPanels({ initial }: { initial: OpsData }) {
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-card/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-slate-100">Pipeline Produksi</h2>
          <span className="text-xs text-slate-500">
            {error ? (
              <button
                type="button"
                onClick={() => void refresh()}
                title="Coba sinkronisasi lagi"
                className="text-red-400 underline decoration-dotted hover:text-red-300"
              >
                {error} — Coba lagi
              </button>
            ) : (
              `auto-refresh · ${lastSync.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
            )}
          </span>
        </div>
        <PipelineViz data={data.pipeline} />
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-medium text-slate-100">Antrian Review</h2>
            <Link href="/dashboard/queues" className="text-xs text-yellow-400 hover:underline">
              Buka semua antrian →
            </Link>
          </div>
          <ReviewQueues data={data.pipeline} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-card/40 p-5 lg:col-span-2">
          <h2 className="mb-4 font-medium text-slate-100">Monitoring SLA</h2>
          <SlaPanel data={data.sla} />
        </section>
        <section className="rounded-xl border border-line bg-card/40 p-5">
          <h2 className="mb-2 font-medium text-slate-100">Distribusi Keyakinan AI</h2>
          <p className="mb-2 text-xs text-slate-500">Skor confidence jurnal aktual</p>
          <ConfidenceChart data={data.confidence} />
        </section>
      </div>

      <section className="rounded-xl border border-line bg-card/40 p-5">
        <h2 className="mb-1 font-medium text-slate-100">Aktivitas Terbaru</h2>
        <ActivityFeed data={data.activity} />
      </section>
    </div>
  );
}
