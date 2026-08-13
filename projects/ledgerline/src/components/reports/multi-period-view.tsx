/**
 * Ikhtisar Multi-Periode + Chart Dashboard — tab baru di Laporan Keuangan.
 * Menampilkan tabel Unilever-style + grafik donut/bar/trend.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { HighlightsTable } from "./highlights-table";
import { DonutChart, HBarChart, TrendChart, VBarChart, withColors } from "@/components/charts/svg-chart";
import { SelectClient, PeriodInput } from "./analytics-views";
import { EmptyState } from "@/components/ui/empty-state";
import type { MultiPeriodHighlights } from "@/server/multi-period";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthlyLabel = (period: string) => {
  const [, m] = period.split("-").map(Number);
  return MONTH_LABELS[(m ?? 1) - 1] ?? period;
};

type Client = { id: string; name: string };

type AnalysisData = {
  ratios: { key: string; label: string; value: number | null; verdict: string; note: string }[];
  charts: {
    komposisiAset: { label: string; value: number; color: string }[];
    pendapatanVsBeban: { pendapatan: number; beban: number };
  };
  narrative: string[];
};

export function MultiPeriodView({
  clients, period, clientId, setClientId, setPeriod,
}: {
  clients: Client[];
  period: string;
  clientId: string;
  setClientId: (v: string) => void;
  setPeriod: (v: string) => void;
}) {
  const [highlights, setHighlights] = useState<MultiPeriodHighlights | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mode perbandingan: "tahunan" = 5 tahun terakhir; "bulanan" = 12 bulan dalam tahun yang sama.
  const [mode, setMode] = useState<"tahunan" | "bulanan">("tahunan");

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const [y, m] = period.split("-").map(Number);
      const periods: string[] = [];
      if (mode === "bulanan") {
        // Periodik bulanan: Jan–Des pada tahun yang sama dengan periode aktif.
        for (let i = 1; i <= 12; i++) periods.push(`${y}-${String(i).padStart(2, "0")}`);
      } else {
        // Tahunan: 5 tahun terakhir, dibandingkan pada bulan yang sama.
        for (let i = 0; i < 5; i++) {
          let ym = y! - i;
          if (ym < 2020) break; // oldest 2020
          periods.push(`${ym}-${String(m!).padStart(2, "0")}`);
        }
        periods.reverse(); // oldest → newest
      }

      const [hlRes, anRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/multi-period?periods=${encodeURIComponent(periods.join(","))}`),
        fetch(`/api/clients/${clientId}/analytics?period=${encodeURIComponent(period)}`),
      ]);

      if (hlRes.ok) {
        const { data } = await hlRes.json() as { data: MultiPeriodHighlights };
        setHighlights(data);
      }
      if (anRes.ok) {
        const { data } = await anRes.json() as { data: AnalysisData };
        setAnalysis(data);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId, period, mode]);

  useEffect(() => { void load(); }, [load]);

  if (!clientId) return <EmptyState title="Pilih klien" description="Pilih klien untuk melihat ikhtisar." />;

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <SelectClient clients={clients} clientId={clientId} setClientId={setClientId} />
        <PeriodInput period={period} setPeriod={setPeriod} />
        {/* Toggle mode perbandingan */}
        <div className="flex items-end gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
          {(["tahunan", "bulanan"] as const).map((md) => (
            <button
              key={md}
              type="button"
              onClick={() => setMode(md)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                mode === md ? "bg-accent text-[#0b1120]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {md === "tahunan" ? "📅 Tahunan" : "🗓️ Bulanan"}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-800 bg-red-950/20 p-3 text-xs text-red-400">{error}</div>}

      {/* ── 1. Highlights Table ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-100">📊 Ikhtisar Keuangan Multi-Periode</h3>
          <p className="text-xs text-slate-400">
            {mode === "tahunan" ? "5 tahun terakhir · benchmark Unilever Annual Report" : "12 bulan dalam tahun yang sama · perbandingan periodik"}
          </p>
        </div>
        <div className="p-2">
          <HighlightsTable data={highlights} loading={loading} formatPeriod={mode === "bulanan" ? monthlyLabel : undefined} />
        </div>
      </div>

      {/* ── 2. Charts ── */}
      {analysis && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Donut: Komposisi Aset */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <DonutChart data={analysis.charts.komposisiAset} title="Komposisi Aset" size={180} />
          </div>

          {/* VBar: Pendapatan vs Beban */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <VBarChart
              data={withColors([
                { label: "Pendapatan", value: analysis.charts.pendapatanVsBeban.pendapatan },
                { label: "Beban", value: analysis.charts.pendapatanVsBeban.beban },
              ])}
              title="Pendapatan vs Beban"
              height={100}
            />
          </div>
        </div>
      )}

      {/* ── 3. Narasi Analisa ── */}
      {analysis && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="mb-2 text-xs font-medium text-slate-400">Narasi Analisa</h4>
          <ul className="space-y-1">
            {analysis.narrative.map((n, i) => (
              <li key={i} className="text-xs text-slate-300">• {n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 4. Upload Laporan Historis ── */}
      <UploadHistoricalReports clientId={clientId} period={period} onUploaded={load} />
    </div>
  );
}

// ── Upload Historical Reports ────────────────────────────────────────────────

function UploadHistoricalReports({
  clientId, onUploaded,
}: {
  clientId: string;
  period: string;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [histPeriod, setHistPeriod] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file || !histPeriod) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("clientId", clientId);
      form.append("periodLabel", histPeriod);
      form.append("type", "historical-trial-balance");

      const res = await fetch("/api/documents", { method: "POST", body: form });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Upload gagal" }));
        throw new Error(error as string ?? "Upload gagal");
      }
      setMessage("✅ Laporan historis berhasil diupload. Data akan diproses pipeline.");
      setFile(null);
      onUploaded();
    } catch (e) {
      setMessage(`❌ ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h4 className="mb-3 text-xs font-medium text-slate-400">📤 Upload Laporan Keuangan Historis</h4>
      <p className="mb-3 text-xs text-slate-500">
        Upload laporan keuangan tahun-tahun sebelumnya (PDF, XLSX, JPG) untuk ditambahkan ke ikhtisar multi-periode.
        Pipeline OCR akan mengekstrak data dan menambahkannya ke trial balance historis.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Periode Historis
          <input
            type="month" value={histPeriod}
            onChange={(e) => setHistPeriod(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-yellow-400/50 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          File Laporan
          <input
            type="file" accept=".pdf,.xlsx,.xls,.csv,.jpg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 file:mr-2 file:rounded file:border-0 file:bg-yellow-400/20 file:px-2 file:py-1 file:text-xs file:text-yellow-300"
          />
        </label>
        <button
          type="button" onClick={() => void handleUpload()}
          disabled={!file || !histPeriod || uploading}
          className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-300 transition hover:bg-yellow-400/20 disabled:opacity-40"
        >
          {uploading ? "Mengupload…" : "Upload"}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${message.startsWith("✅") ? "text-emerald-400" : "text-red-400"}`}>{message}</p>
      )}
    </div>
  );
}
