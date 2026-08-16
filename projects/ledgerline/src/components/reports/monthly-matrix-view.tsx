/**
 * Matrix 12 Bulan (Gap #3) — pola kertas kerja "LR/NRC (1-12)".
 * Laba Rugi per bulan (Jan–Des) + kolom Total; Neraca posisi akhir bulan (kumulatif YTD).
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { formatCurrencyRp } from "@/lib/format";
import { SelectClient, PeriodInput } from "./analytics-views";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type Client = { id: string; name: string };

type MonthRow = {
  period: string;
  pendapatan: number;
  beban: number;
  laba: number;
  labaKumulatif: number;
  aset: number;
  liabilitas: number;
  ekuitas: number;
};

type Matrix = {
  clientName: string;
  year: number;
  months: MonthRow[];
  totals: { pendapatan: number; beban: number; laba: number; aset: number; liabilitas: number; ekuitas: number };
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthLabel = (p: string) => {
  const m = parseInt(p.slice(-2), 10);
  return MONTH_LABELS[(m ?? 1) - 1] ?? p;
};

export function MonthlyMatrixView({
  clients, period, clientId, setClientId, setPeriod,
}: {
  clients: Client[];
  period: string;
  clientId: string;
  setClientId: (v: string) => void;
  setPeriod: (v: string) => void;
}) {
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["monthly-matrix", clientId, period],
    queryFn: async () => {
      const year = parseInt(period.slice(0, 4), 10);
      const res = await fetch(`/api/clients/${clientId}/monthly-matrix?year=${year}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat matrix");
      return json.data as Matrix;
    },
    enabled: !!clientId,
  });

  if (!clientId) return <EmptyState title="Pilih klien" description="Pilih klien untuk melihat matrix 12 bulan." />;

  const fmt = (n: number) => (n === 0 ? "—" : formatCurrencyRp(n));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <SelectClient clients={clients} clientId={clientId} setClientId={setClientId} />
        <PeriodInput period={period} setPeriod={setPeriod} />
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {loading && <p className="p-4 text-sm text-slate-700">Menghitung matrix 12 bulan…</p>}

      {!loading && data && (
        <div className="space-y-5">
          {/* ── Laba Rugi per Bulan ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-medium text-slate-900">📈 Laba Rugi per Bulan — {data.year}</h3>
              <p className="text-xs text-slate-700">Transaksi bulan berjalan (non-kumulatif), pola kertas kerja (1-12).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Pos</th>
                    {data.months.map((m) => (
                      <th key={m.period} className="px-2 py-2 font-medium">{monthLabel(m.period)}</th>
                    ))}
                    <th className="px-3 py-2 font-medium text-accent">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["Pendapatan", (m: MonthRow) => m.pendapatan],
                    ["Beban", (m: MonthRow) => m.beban],
                    ["Laba (Rugi)", (m: MonthRow) => m.laba],
                  ] as [string, (m: MonthRow) => number][]).map(([label, get]) => (
                    <tr key={label} className={`border-t border-slate-200/60 ${label === "Laba (Rugi)" ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                      <td className="px-3 py-2 text-left">{label}</td>
                      {data.months.map((m) => (
                        <td key={m.period} className={`px-2 py-2 font-mono ${get(m) < 0 ? "text-rose-600" : ""}`}>{fmt(get(m))}</td>
                      ))}
                      <td className="px-3 py-2 font-mono text-accent">
                        {fmt(label === "Pendapatan" ? data.totals.pendapatan : label === "Beban" ? data.totals.beban : data.totals.laba)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Neraca Posisi Akhir Bulan ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-medium text-slate-900">📊 Neraca Posisi Akhir Bulan — {data.year}</h3>
              <p className="text-xs text-slate-700">Kumulatif Januari–bulan berjalan (laba YTD masuk ekuitas).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Pos</th>
                    {data.months.map((m) => (
                      <th key={m.period} className="px-2 py-2 font-medium">{monthLabel(m.period)}</th>
                    ))}
                    <th className="px-3 py-2 font-medium text-accent">Des (Akhir Th)</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["Total Aset", (m: MonthRow) => m.aset],
                    ["Total Liabilitas", (m: MonthRow) => m.liabilitas],
                    ["Total Ekuitas (incl. laba YTD)", (m: MonthRow) => m.ekuitas],
                    ["Laba Kumulatif (YTD)", (m: MonthRow) => m.labaKumulatif],
                  ] as [string, (m: MonthRow) => number][]).map(([label, get]) => (
                    <tr key={label} className={`border-t border-slate-200/60 ${label === "Total Ekuitas (incl. laba YTD)" ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                      <td className="px-3 py-2 text-left">{label}</td>
                      {data.months.map((m) => (
                        <td key={m.period} className={`px-2 py-2 font-mono ${get(m) < 0 ? "text-rose-600" : ""}`}>{fmt(get(m))}</td>
                      ))}
                      <td className="px-3 py-2 font-mono text-accent">
                        {fmt(label === "Total Aset" ? data.totals.aset : label === "Total Liabilitas" ? data.totals.liabilitas : label === "Total Ekuitas (incl. laba YTD)" ? data.totals.ekuitas : data.months[11]?.labaKumulatif ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-slate-700">
            💡 Pola ini mengikuti kertas kerja akuntan (mis. LR_2025 (1-12)): kolom bulan = transaksi bulan tersebut; kolom Total/Des = akumulasi setahun.
          </p>
        </div>
      )}
    </div>
  );
}
