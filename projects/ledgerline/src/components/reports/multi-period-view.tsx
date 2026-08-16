/**
 * Ikhtisar Multi-Periode + Chart Dashboard — tab baru di Laporan Keuangan.
 * Menampilkan tabel Unilever-style + grafik donut/bar/trend.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  // Mode perbandingan: "tahunan" = 5 tahun terakhir; "bulanan" = 12 bulan dalam tahun yang sama.
  const [mode, setMode] = useState<"tahunan" | "bulanan">("tahunan");

  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["multi-period", clientId, period, mode],
    queryFn: async () => {
      const [y, m] = period.split("-").map(Number);
      const periods: string[] = [];
      if (mode === "bulanan") {
        for (let i = 1; i <= 12; i++) periods.push(`${y}-${String(i).padStart(2, "0")}`);
      } else {
        for (let i = 0; i < 5; i++) {
          const ym = y! - i;
          if (ym < 2020) break; // oldest 2020
          periods.push(`${ym}-${String(m!).padStart(2, "0")}`);
        }
        periods.reverse(); // oldest → newest
      }

      const [hlRes, anRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/multi-period?periods=${encodeURIComponent(periods.join(","))}`),
        fetch(`/api/clients/${clientId}/analytics?period=${encodeURIComponent(period)}`),
      ]);

      let highlights: MultiPeriodHighlights | null = null;
      let analysis: AnalysisData | null = null;
      if (hlRes.ok) highlights = ((await hlRes.json()) as { data: MultiPeriodHighlights }).data;
      if (anRes.ok) analysis = ((await anRes.json()) as { data: AnalysisData }).data;
      return { highlights, analysis };
    },
    enabled: !!clientId,
  });

  const highlights = data?.highlights ?? null;
  const analysis = data?.analysis ?? null;

  if (!clientId) return <EmptyState title="Pilih klien" description="Pilih klien untuk melihat ikhtisar." />;

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <SelectClient clients={clients} clientId={clientId} setClientId={setClientId} />
        <PeriodInput period={period} setPeriod={setPeriod} />
        {/* Toggle mode perbandingan */}
        <div className="flex items-end gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(["tahunan", "bulanan"] as const).map((md) => (
            <button
              key={md}
              type="button"
              onClick={() => setMode(md)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                mode === md ? "bg-accent text-[#ffffff]" : "text-slate-700 hover:text-slate-800"
              }`}
            >
              {md === "tahunan" ? "📅 Tahunan" : "🗓️ Bulanan"}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-800 bg-red-950/20 p-3 text-xs text-red-600">{(error as Error).message}</div>}

      {/* ── 1. Highlights Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-900">📊 Ikhtisar Keuangan Multi-Periode</h3>
          <p className="text-xs text-slate-700">
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
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <DonutChart data={analysis.charts.komposisiAset} title="Komposisi Aset" size={180} />
          </div>

          {/* VBar: Pendapatan vs Beban */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
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
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="mb-2 text-xs font-medium text-slate-700">Narasi Analisa</h4>
          <ul className="space-y-1">
            {analysis.narrative.map((n, i) => (
              <li key={i} className="text-xs text-slate-700">• {n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 4. Upload Laporan Historis ── */}
      <UploadHistoricalReports clientId={clientId} period={period} onUploaded={() => void refetch()} />
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-xs font-medium text-slate-700">📤 Upload Laporan Keuangan Historis</h4>
      <p className="mb-3 text-xs text-slate-700">
        Upload laporan keuangan tahun-tahun sebelumnya (PDF, XLSX, JPG) untuk ditambahkan ke ikhtisar multi-periode.
        Pipeline OCR akan mengekstrak data dan menambahkannya ke trial balance historis.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Periode Historis
          <input
            type="month" value={histPeriod}
            onChange={(e) => setHistPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          File Laporan
          <input
            type="file" accept=".pdf,.xlsx,.xls,.csv,.jpg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 file:mr-2 file:rounded file:border-0 file:bg-accent/20 file:px-2 file:py-1 file:text-xs file:text-accent"
          />
        </label>
        <button
          type="button" onClick={() => void handleUpload()}
          disabled={!file || !histPeriod || uploading}
          className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent transition hover:bg-accent/20 disabled:opacity-40"
        >
          {uploading ? "Mengupload…" : "Upload"}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${message.startsWith("✅") ? "text-emerald-600" : "text-red-600"}`}>{message}</p>
      )}
    </div>
  );
}
