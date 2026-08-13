/**
 * Dockable Dashboard — PoC menggunakan Dockview (dockview-react).
 * Panel dashboard (KPI, Pipeline, SLA, Quality) bisa di-drag, di-resize,
 * di-tab, dan di-float — layout tersimpan per browser.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { DockviewReadyEvent } from "dockview-core";
import { getPresetLabel, getRolePreset, type DockPanelDef } from "@/server/dashboard-presets";
import "dockview/dist/styles/dockview.css";

// ── Data types (mirror server/dashboard.ts) ─────────────────────────────────

type KpiData = {
  firstPassRate: number;
  activeClients: number;
  newClientsThisMonth: number;
  aiAutomationPct: number;
  jobsInProgress: number;
  aiDraftJobs: number;
  reviewJobs: number;
  transactionsToday: number;
  avgDailyTransactions: number;
  transactionsDeltaPct: number | null;
  slaBreachCount: number;
};

type PipelineData = {
  stages: { key: string; label: string; count: number; hint: string }[];
};

type SlaData = {
  rows: {
    stage: string;
    completed: number;
    met: number;
    breached: number;
    pending: number;
    overdue: number;
    avgPct: number;
  }[];
};

type InsightsData = {
  weeklyTrend: { weekLabel: string; totalJournals: number; exceptionRate: number; firstPassRate: number }[];
  industry: {
    industry: string;
    totalJournals: number;
    exceptionRate: number;
    firstPassRate: number;
  }[];
  reasons: { flag: string; count: number; lastSeen: string }[];
};

type PanelProps = {
  kpi?: KpiData;
  pipeline?: PipelineData;
  sla?: SlaData;
  insights?: InsightsData;
};

// ── Panel Components ─────────────────────────────────────────────────────────

function KpiPanel({ kpi }: PanelProps) {
  if (!kpi) return <div className="p-4 text-sm text-slate-500">Data tidak tersedia</div>;
  const cards = [
    { label: "FIRST-PASS RATE", value: `${kpi.firstPassRate}%`, sub: "jurnal langsung disetujui", href: "/dashboard/quality" },
    { label: "KLIEN AKTIF", value: `${kpi.activeClients}`, sub: `+${kpi.newClientsThisMonth} bulan ini`, href: "/dashboard/clients" },
    { label: "AI AUTOMATION", value: `${kpi.aiAutomationPct}%`, sub: "jurnal AI tanpa exception", href: "/dashboard/pipeline" },
    { label: "JOBS IN PROGRESS", value: `${kpi.jobsInProgress}`, sub: `${kpi.aiDraftJobs} draft · ${kpi.reviewJobs} review`, href: "/dashboard/pipeline" },
    { label: "TRANSAKSI HARI INI", value: `${kpi.transactionsToday}`, sub: kpi.transactionsDeltaPct !== null ? `${kpi.transactionsDeltaPct >= 0 ? "+" : ""}${kpi.transactionsDeltaPct}% vs rata-rata` : "", href: "/dashboard/journals" },
    { label: "SLA BREACHES", value: `${kpi.slaBreachCount}`, sub: "melewati batas waktu review", href: "/dashboard/sla" },
  ];
  return (
    <div className="grid h-full grid-cols-2 gap-3 overflow-y-auto p-4 lg:grid-cols-3">
      {cards.map((c) => (
        <a
          key={c.label}
          href={c.href}
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-yellow-400/40 hover:bg-slate-900"
        >
          <p className="text-[11px] text-slate-400">{c.label}</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-yellow-300">{c.value}</p>
          <p className="mt-1 text-[11px] text-slate-500">{c.sub}</p>
        </a>
      ))}
    </div>
  );
}

function PipelinePanel({ pipeline }: PanelProps) {
  if (!pipeline) return <div className="p-4 text-sm text-slate-500">Data tidak tersedia</div>;
  return (
    <div className="space-y-2 overflow-y-auto p-4">
      {pipeline.stages.map((s) => (
        <a
          key={s.key}
          href="/dashboard/pipeline"
          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 transition hover:border-yellow-400/40 hover:bg-slate-900"
        >
          <div>
            <p className="text-sm font-medium text-slate-200">{s.label}</p>
            <p className="text-[11px] text-slate-500">{s.hint}</p>
          </div>
          <span className="rounded-full bg-yellow-400/15 px-2.5 py-1 font-mono text-sm text-yellow-300">{s.count}</span>
        </a>
      ))}
    </div>
  );
}

function SlaPanel({ sla }: PanelProps) {
  if (!sla) return <div className="p-4 text-sm text-slate-500">Data tidak tersedia</div>;
  return (
    <div className="overflow-y-auto p-4">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500">
            <th className="py-2 font-medium">Tahap</th>
            <th className="py-2 text-right font-medium">Antre</th>
            <th className="py-2 text-right font-medium">Terlambat</th>
            <th className="py-2 text-right font-medium">Selesai</th>
            <th className="py-2 text-right font-medium">SLA %</th>
          </tr>
        </thead>
        <tbody>
          {sla.rows.map((r) => (
            <tr key={r.stage} className="border-b border-slate-800/50 text-slate-300 transition hover:bg-slate-900/60">
              <td className="py-1.5">
                <a href="/dashboard/sla" className="block text-slate-200 hover:text-yellow-300">
                  {r.stage}
                </a>
              </td>
              <td className="py-1.5 text-right font-mono">{r.pending}</td>
              <td className="py-1.5 text-right font-mono text-rose-400">{r.overdue}</td>
              <td className="py-1.5 text-right font-mono">{r.completed}</td>
              <td className={`py-1.5 text-right font-mono ${r.avgPct >= 90 ? "text-emerald-400" : "text-rose-400"}`}>
                {r.avgPct}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualityPanel({ insights }: PanelProps) {
  if (!insights) return <div className="p-4 text-sm text-slate-500">Data tidak tersedia</div>;
  const max = Math.max(...insights.weeklyTrend.map((t) => t.totalJournals), 1);
  return (
    <div className="space-y-4 overflow-y-auto p-4">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">Tren Mingguan (jurnal vs exception %)</p>
        <div className="space-y-1">
          {insights.weeklyTrend.map((t) => (
            <a key={t.weekLabel} href="/dashboard/quality" className="flex items-center gap-2 rounded transition hover:bg-slate-900/60">
              <span className="w-16 text-[10px] text-slate-500">{t.weekLabel}</span>
              <div className="h-3 flex-1 overflow-hidden rounded bg-slate-800">
                <div className="h-full bg-yellow-400/70" style={{ width: `${(t.totalJournals / max) * 100}%` }} />
              </div>
              <span className="w-16 text-right font-mono text-[10px] text-slate-400">{t.totalJournals}</span>
              {t.exceptionRate > 0 && <span className="font-mono text-[10px] text-rose-400">⚠{t.exceptionRate}%</span>}
            </a>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">Per Industri</p>
        <div className="space-y-1">
          {insights.industry.map((ind) => (
            <a
              key={ind.industry}
              href="/dashboard/quality"
              className="flex justify-between rounded border border-slate-800 bg-slate-900/40 px-2 py-1 text-[11px] transition hover:border-yellow-400/40 hover:bg-slate-900"
            >
              <span className="text-slate-300">{ind.industry}</span>
              <span className="font-mono text-slate-500">{ind.totalJournals} jurnal · exc {ind.exceptionRate}% · fp {ind.firstPassRate}%</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Dockview Wrapper (dynamic import, SSR-safe) ──────────────────────────────

const DockviewReact = dynamic(
  () => import("dockview-react").then((m) => m.DockviewReact),
  { ssr: false },
);

export function DockableDashboard({ data, role = "ADMIN" }: { data: PanelProps; role?: string }) {
  const [ready, setReady] = useState<{ layout: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const apiRef = useRef<DockviewReadyEvent["api"] | null>(null);
  const loadedRef = useRef(false);
  const preset = getRolePreset(role);

  // Muat layout tersimpan per user SEBELUM DockviewReact mount (hindari race async di onReady).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let layout: string | null = null;
      try {
        const res = await fetch("/api/dashboard/layout");
        const json = await res.json();
        if (res.ok && json.layout) layout = json.layout;
      } catch {
        // fallback default
      }
      if (!cancelled) setReady({ layout });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildDefaultLayout = useCallback(
    (api: DockviewReadyEvent["api"], defs: DockPanelDef[]) => {
      let prevId: string | undefined;
      defs.forEach((d, i) => {
        if (api.getPanel(d.id)) return; // idempotent — aman dari double-mount StrictMode
        api.addPanel({
          id: d.id,
          component: d.component,
          title: d.title,
          position:
            i === 0
              ? { direction: "right" }
              : { referencePanel: prevId, direction: i % 2 === 1 ? "below" : "right" },
        });
        prevId = d.id;
      });
    },
    [],
  );

  const saveLayout = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !loadedRef.current) return;
    try {
      const layout = JSON.stringify(api.toJSON());
      await fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      setLastSaved(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      // gagal simpan — jangan ganggu pengguna, layout tetap berlaku sesi ini
    }
  }, []);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      const api = event.api;
      apiRef.current = api;
      // Guard double-mount (React StrictMode dev): jangan init ulang jika panel sudah ada.
      if (api.panels.length > 0 || !ready) return;
      loadedRef.current = false;

      // Muat layout tersimpan; fallback ke preset role.
      try {
        if (ready.layout) {
          api.fromJSON(JSON.parse(ready.layout));
        } else {
          buildDefaultLayout(api, preset);
        }
      } catch {
        buildDefaultLayout(api, preset);
      }
      loadedRef.current = true;

      // Simpan otomatis setiap layout berubah (drag, resize, close, reorder).
      api.onDidLayoutChange(() => {
        void saveLayout();
      });
    },
    [buildDefaultLayout, saveLayout, ready, preset],
  );

  const resetLayout = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    setSaving(true);
    try {
      await fetch("/api/dashboard/layout", { method: "DELETE" });
      api.clear();
      buildDefaultLayout(api, preset);
      setLastSaved(null);
    } finally {
      setSaving(false);
    }
  }, [buildDefaultLayout, preset]);

  if (!ready) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-500">Memuat workspace…</div>;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1">Workspace Dockable</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1">{getPresetLabel(role)}</span>
          {lastSaved && <span className="px-1">Tersimpan {lastSaved}</span>}
        </div>
        <button
          onClick={resetLayout}
          disabled={saving}
          className="rounded-md border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-50"
        >
          {saving ? "Mereset…" : "Reset Layout"}
        </button>
      </div>
      <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-800">
        <DockviewReact
          className="dockview-theme-dark"
          components={{
            kpi: () => <KpiPanel kpi={data.kpi} />,
            pipeline: () => <PipelinePanel pipeline={data.pipeline} />,
            sla: () => <SlaPanel sla={data.sla} />,
            quality: () => <QualityPanel insights={data.insights} />,
          }}
          onReady={onReady}
        />
      </div>
    </div>
  );
}
