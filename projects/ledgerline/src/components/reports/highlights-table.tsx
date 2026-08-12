/**
 * Multi-Period Highlights Table — gaya Unilever Annual Report.
 * Menampilkan tabel ikhtisar keuangan 5 tahun dengan Laba Rugi,
 * Posisi Keuangan, dan Rasio dalam format kompak.
 */

"use client";

import type { MultiPeriodHighlights, PeriodHighlight } from "@/server/multi-period";

const fmtB = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(1)} T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)} M`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)} Jt`;
  return n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
};

const fmtPct = (n: number | null): string => {
  if (n === null || !isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
};

const fmtR = (n: number | null): string => {
  if (n === null || !isFinite(n)) return "—";
  return n.toFixed(2);
};

function Delta({ current, prev }: { current: number; prev?: number }) {
  if (!prev || prev === 0) return null;
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  const color = pct > 0 ? "text-emerald-400" : pct < 0 ? "text-rose-400" : "text-slate-500";
  const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
  return <span className={`ml-1 text-[10px] ${color}`}>{arrow}{Math.abs(pct).toFixed(0)}%</span>;
}

export function HighlightsTable({ data, loading }: { data: MultiPeriodHighlights | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
        Menghitung ikhtisar keuangan multi-periode…
      </div>
    );
  }

  if (!data || data.periods.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
        Belum ada data multi-periode. Upload laporan keuangan historis untuk melihat tren.
      </div>
    );
  }

  const periods = data.periods;
  const latest = periods[periods.length - 1]!;
  const prev = periods.length > 1 ? periods[periods.length - 2] : undefined;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-[11px] text-slate-400">
            <th className="px-3 py-2 font-medium">Pos</th>
            {periods.map((p) => (
              <th key={p.period} className={`px-3 py-2 text-right font-medium ${p.period === latest.period ? "text-yellow-300" : ""}`}>
                {p.period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Laba Rugi */}
          <tr className="bg-slate-800/30">
            <td colSpan={periods.length + 1} className="px-3 py-1.5 text-[11px] font-semibold text-yellow-300/80">
              LAPORAN LABA RUGI
            </td>
          </tr>
          {(["penjualanBersih","labaKotor","labaUsaha","ebitda","labaBersih"] as const).map((k) => (
            <SectionRow key={k} label={LABELS[k]} periods={periods} get={(p) => p[k]} isMoney />
          ))}

          {/* Posisi Keuangan */}
          <tr className="bg-slate-800/30">
            <td colSpan={periods.length + 1} className="px-3 py-1.5 text-[11px] font-semibold text-yellow-300/80">
              POSISI KEUANGAN
            </td>
          </tr>
          {(["totalAset","totalLiabilitas","totalEkuitas"] as const).map((k) => (
            <SectionRow key={k} label={LABELS[k]} periods={periods} get={(p) => p[k]} isMoney />
          ))}

          {/* Rasio */}
          <tr className="bg-slate-800/30">
            <td colSpan={periods.length + 1} className="px-3 py-1.5 text-[11px] font-semibold text-yellow-300/80">
              RASIO KEUANGAN
            </td>
          </tr>
          {(["gpm","opm","npm","roa","roe","currentRatio"] as const).map((k) => (
            <SectionRow key={k} label={LABELS[k]} periods={periods} get={(p) => p[k]} isRatio />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LABELS: Record<string, string> = {
  penjualanBersih: "Penjualan Bersih",
  labaKotor: "Laba Kotor",
  labaUsaha: "Laba Usaha",
  ebitda: "EBITDA",
  labaBersih: "Laba Bersih",
  totalAset: "Total Aset",
  totalLiabilitas: "Total Liabilitas",
  totalEkuitas: "Total Ekuitas",
  gpm: "GPM",
  opm: "OPM",
  npm: "NPM",
  roa: "ROA",
  roe: "ROE",
  currentRatio: "Rasio Lancar",
};

function SectionRow({
  label, periods, get, isMoney, isRatio,
}: {
  label: string;
  periods: PeriodHighlight[];
  get: (p: PeriodHighlight) => number | null;
  isMoney?: boolean;
  isRatio?: boolean;
}) {
  const vals = periods.map((p) => get(p));
  const last = vals[vals.length - 1];
  const prevV = vals.length > 1 ? vals[vals.length - 2] : undefined;

  return (
    <tr className="border-b border-slate-800/40 text-[11px]">
      <td className="px-3 py-1.5 text-slate-400">{label}</td>
      {vals.map((v, i) => {
        const isLast = i === vals.length - 1;
        return (
          <td key={i} className={`px-3 py-1.5 text-right font-mono ${isLast ? "text-slate-100" : "text-slate-400"}`}>
            {v === null ? "—" : isMoney ? fmtB(v) : isRatio ? fmtPct(v) : v.toFixed(2)}
            {isLast && v !== null && prevV !== null && prevV !== undefined && (
              <Delta current={v} prev={prevV} />
            )}
          </td>
        );
      })}
    </tr>
  );
}
