"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
const rp = (n: number) => `Rp${fmt(n)}`;

type Client = { id: string; name: string };

// ── Tipe untuk analisa (di-import oleh sub-view) ──
export type AnalysisData = {
  clientName: string;
  period: string;
  ratios: { key: string; label: string; value: number | null; formula: string; benchmark: string; verdict: string; note: string }[];
  charts: { komposisiAset: { label: string; value: number; color: string }[]; pendapatanVsBeban: { pendapatan: number; beban: number }; kontribusiPendapatan: { label: string; value: number; color: string }[]; kontribusiBeban: { label: string; value: number; color: string }[] };
  narrative: string[];
};

export type CalkData = {
  clientName: string;
  period: string;
  sections: { number: number; title: string; paragraphs: string[]; items?: { label: string; value: string }[] }[];
};

export type TaxData = {
  clientName: string;
  period: string;
  taxRatio: { value: number | null; formula: string; note: string };
  ppn: { pk: number; pm: number; kurangBayar: number; note: string };
  pph: { pph21: number; pph23: number; pph25_29: number; totalPPh: number; effectiveTaxRate: number | null; note: string };
  breakdown: { label: string; value: number; note: string }[];
  narrative: string[];
};

export type AnnualData = {
  clientName: string;
  period: string;
  legalName: string;
  industry: string;
  preparedAt: string;
  highlights: { label: string; value: string }[];
  analysis: { narrative: string[]; ratios: { label: string; value: number | null; verdict: string; formula: string }[] };
  calk: { sections: { number: number; title: string; paragraphs: string[]; items?: { label: string; value: string }[] }[] };
  taxAnalysis: { narrative: string[]; breakdown: { label: string; value: number; note: string }[] };
  statements: {
    labaRugi: { lines: { label: string; amount: number; indent?: number; bold?: boolean }[] };
    neraca: { lines: { label: string; amount: number; indent?: number; bold?: boolean }[] };
    ekuitas: { lines: { label: string; amount: number; indent?: number; bold?: boolean }[] };
    arusKas: { lines: { label: string; amount: number; indent?: number; bold?: boolean }[] };
  };
};

// ── Helpers bersama ──────────────────────────────────────────────────────────

export function useAnalytics<T>(clientId: string, period: string, scope: string, enabled: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/analytics?period=${period}&scope=${scope}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal memuat data.");
      setData(j.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId, period, scope, enabled]);

  useEffect(() => {
    async function start() {
      await load();
    }
    void start();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function RatioCard({ r }: {
  r: { label: string; value: number | null; formula: string; benchmark: string; verdict: string; note: string };
}) {
  const tone = r.verdict === "BAIK" ? "positive" : r.verdict === "WASPADA" ? "warning" : r.verdict === "KURANG" ? "danger" : "neutral";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-200">{r.label}</p>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
          tone === "positive" ? "bg-emerald-400/10 text-emerald-300" :
          tone === "danger" ? "bg-rose-400/10 text-rose-300" :
          tone === "warning" ? "bg-amber-400/10 text-amber-300" :
          "bg-slate-700 text-slate-300"
        }`}>{r.verdict}</span>
      </div>
      <p className="mt-2 font-mono text-xl text-slate-100">{r.value === null ? "N/A" : r.value.toFixed(2)}</p>
      <p className="mt-1 text-xs text-slate-500">{r.formula}</p>
      <p className="text-xs text-slate-500">Benchmark: {r.benchmark}</p>
      <p className="mt-2 text-xs text-slate-400">{r.note}</p>
    </div>
  );
}

export function BarChart({ series, color }: { series: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <div className="space-y-2">
      {series.map((s) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className="w-40 truncate text-xs text-slate-400" title={s.label}>{s.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-slate-800">
            <div className="h-full rounded transition-all" style={{ width: `${Math.max((Math.abs(s.value) / max) * 100, 2)}%`, backgroundColor: color }} />
          </div>
          <span className="w-28 text-right font-mono text-xs text-slate-300">{rp(s.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SelectClient({ clients, clientId, setClientId }: { clients: Client[]; clientId: string; setClientId: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      Klien
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
        {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
      </select>
    </label>
  );
}

export function PeriodInput({ period, setPeriod }: { period: string; setPeriod: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      Periode
      <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" />
    </label>
  );
}

export function EmptyAnalytics() {
  return <EmptyState title="Pilih klien & periode" description="Analisa dihitung dari jurnal yang disetujui." />;
}

// Re-export views dari file masing-masing
export { AnalysisView } from "./analysis-view";
export { CalkView } from "./calk-view";
export { TaxAnalysisView } from "./tax-analysis-view";
export { AnnualReportView } from "./annual-report-view";
