"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
const rp = (n: number) => `Rp${fmt(n)}`;

type Client = { id: string; name: string };

import { useAnalytics, type TaxData, SelectClient, PeriodInput } from "./analytics-views";

export function TaxAnalysisView({ clients, period, clientId, setClientId, setPeriod }: {
  clients: Client[];
  period: string;
  clientId: string;
  setClientId: (v: string) => void;
  setPeriod: (v: string) => void;
}) {
  const { data, loading, error, reload } = useAnalytics<TaxData>(clientId, period, "tax", !!clientId);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <SelectClient clients={clients} clientId={clientId} setClientId={setClientId} />
        <PeriodInput period={period} setPeriod={setPeriod} />
      </div>
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {loading && <Skeleton className="h-64 w-full" />}
      {!loading && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-slate-600">Tax Ratio</p>
              <p className="mt-1 font-mono text-2xl text-amber-600">
                {data.taxRatio.value === null ? "N/A" : `${(data.taxRatio.value * 100).toFixed(1)}%`}
              </p>
              <p className="mt-1 text-xs text-slate-500">{data.taxRatio.formula}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-600">PPN Kurang Bayar</p>
              <p className="mt-1 font-mono text-2xl text-slate-900">{rp(Math.max(data.ppn.kurangBayar, 0))}</p>
              <p className="mt-1 text-xs text-slate-500">{data.ppn.note}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-600">Total PPh</p>
              <p className="mt-1 font-mono text-2xl text-slate-900">{rp(data.pph.totalPPh)}</p>
              <p className="mt-1 text-xs text-slate-500">{data.pph.note}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-600">Effective Tax Rate</p>
              <p className="mt-1 font-mono text-2xl text-slate-900">
                {data.pph.effectiveTaxRate === null ? "N/A" : `${(data.pph.effectiveTaxRate * 100).toFixed(1)}%`}
              </p>
              <p className="mt-1 text-xs text-slate-500">Total PPh ÷ laba</p>
            </Card>
          </div>
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-medium text-slate-800">Rincian Pajak</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-600">
                    <th className="px-3 py-2">Pos</th>
                    <th className="px-3 py-2 text-right">Nilai</th>
                    <th className="px-3 py-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((b) => (
                    <tr key={b.label} className="border-b border-slate-200/60 text-slate-700">
                      <td className="px-3 py-2">{b.label}</td>
                      <td className="px-3 py-2 text-right font-mono">{rp(b.value)}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{b.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-medium text-slate-800">Analisa Pajak</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              {data.narrative.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Penyampaian (Annual Report) ──────────────────────────────────────────────

type AnnualData = {
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

function StmtBlock({ title, lines }: { title: string; lines: { label: string; amount: number; indent?: number; bold?: boolean }[] }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h4 className="mb-2 text-center text-sm font-bold text-slate-900">{title}</h4>
      <div className="space-y-0.5">
        {lines.map((l, i) => (
          <div
            key={i}
            className={`flex justify-between gap-3 text-xs ${
              l.bold ? "border-t border-slate-200 pt-1 font-semibold text-slate-900" : "text-slate-600"
            }`}
            style={{ paddingLeft: `${(l.indent ?? 0) * 14}px` }}
          >
            <span>{l.label}</span>
            <span className="font-mono">{rp(l.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
