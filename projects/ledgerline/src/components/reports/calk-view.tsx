"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

type Client = { id: string; name: string };

import { useAnalytics, type CalkData, SelectClient, PeriodInput } from "./analytics-views";

export function CalkView({ clients, period, clientId, setClientId, setPeriod }: {
  clients: Client[];
  period: string;
  clientId: string;
  setClientId: (v: string) => void;
  setPeriod: (v: string) => void;
}) {
  const { data, loading, error, reload } = useAnalytics<CalkData>(clientId, period, "calk", !!clientId);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <SelectClient clients={clients} clientId={clientId} setClientId={setClientId} />
        <PeriodInput period={period} setPeriod={setPeriod} />
        <a
          href={clientId ? `/api/clients/${clientId}/analytics?period=${period}&scope=calk&format=xlsx` : "#"}
          className={`rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm text-amber-600 transition hover:bg-yellow-400/20 ${
            clientId ? "" : "pointer-events-none opacity-40"
          }`}
        >
          ↓ XLSX
        </a>
        <a
          href={clientId ? `/api/clients/${clientId}/analytics?period=${period}&scope=calk&format=csv` : "#"}
          className={`rounded-lg border border-slate-200 px-3 py-2 text-sm transition ${
            clientId ? "text-slate-800 hover:border-yellow-400/50 hover:text-amber-600" : "pointer-events-none opacity-40"
          }`}
        >
          ↓ CSV
        </a>
      </div>
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {loading && <Skeleton className="h-64 w-full" />}
      {!loading && data && (
        <Card className="p-6">
          <div className="mb-5 text-center">
            <h2 className="font-display text-lg font-bold text-slate-900">CATATAN ATAS LAPORAN KEUANGAN</h2>
            <p className="text-sm text-slate-700">
              {data.clientName} — Periode yang berakhir {data.period}
            </p>
          </div>
          <div className="space-y-6">
            {data.sections.map((s) => (
              <section key={s.number}>
                <h3 className="mb-2 text-sm font-bold text-amber-600">
                  {s.number}. {s.title}
                </h3>
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="mb-2 text-sm leading-relaxed text-slate-700">
                    {p}
                  </p>
                ))}
                {s.items && (
                  <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                    {s.items.map((it) => (
                      <div key={it.label} className="flex justify-between gap-3 border-b border-slate-200 py-1 text-sm">
                        <dt className="text-slate-700">{it.label}</dt>
                        <dd className="font-mono text-slate-800">{it.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Analisa Pajak ────────────────────────────────────────────────────────────

type TaxData = {
  clientName: string;
  period: string;
  taxRatio: { value: number | null; formula: string; note: string };
  ppn: { pk: number; pm: number; kurangBayar: number; note: string };
  pph: { pph21: number; pph23: number; pph25_29: number; totalPPh: number; effectiveTaxRate: number | null; note: string };
  breakdown: { label: string; value: number; note: string }[];
  narrative: string[];
};
