"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
const rp = (n: number) => `Rp${fmt(n)}`;

type Client = { id: string; name: string };

import { useAnalytics, type AnnualData, SelectClient, PeriodInput } from "./analytics-views";

function StmtBlock({ title, lines }: { title: string; lines: { label: string; amount: number; indent?: number; bold?: boolean }[] }) {
  return (
    <div className="rounded-xl border border-slate-800 p-4">
      <h4 className="mb-2 text-center text-sm font-bold text-slate-100">{title}</h4>
      <div className="space-y-0.5">
        {lines.map((l, i) => (
          <div
            key={i}
            className={`flex justify-between gap-3 text-xs ${
              l.bold ? "border-t border-slate-800 pt-1 font-semibold text-slate-100" : "text-slate-400"
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

export function AnnualReportView({ clients, period, clientId, setClientId, setPeriod }: {
  clients: Client[];
  period: string;
  clientId: string;
  setClientId: (v: string) => void;
  setPeriod: (v: string) => void;
}) {
  const { data, loading, error, reload } = useAnalytics<AnnualData>(clientId, period, "annual", !!clientId);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <SelectClient clients={clients} clientId={clientId} setClientId={setClientId} />
        <PeriodInput period={period} setPeriod={setPeriod} />
        <a
          href={clientId ? `/api/clients/${clientId}/analytics?period=${period}&scope=annual&format=pdf` : "#"}
          className={`rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-300 transition hover:bg-yellow-400/20 ${
            clientId ? "" : "pointer-events-none opacity-40"
          }`}
        >
          ↓ Unduh PDF
        </a>
        <a
          href={clientId ? `/api/clients/${clientId}/analytics?period=${period}&scope=annual&format=csv` : "#"}
          className={`rounded-lg border border-slate-700 px-3 py-2 text-sm transition ${
            clientId ? "text-slate-200 hover:border-yellow-400/50 hover:text-yellow-300" : "pointer-events-none opacity-40"
          }`}
        >
          ↓ CSV
        </a>
        <Button variant="secondary" onClick={() => window.print()} disabled={!data}>
          🖨 Cetak
        </Button>
      </div>
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {loading && <Skeleton className="h-64 w-full" />}
      {!loading && data && (
        <Card className="print:p-0 p-6">
          {/* Halaman judul */}
          <div className="mb-8 border-b-2 border-yellow-400 pb-6 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-500">Penyampaian Laporan Keuangan</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-100">{data.legalName}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Laporan Keuangan untuk periode yang berakhir {data.period} beserta Catatan atas Laporan Keuangan
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Bidang usaha: {data.industry} · Disusun per {data.preparedAt}
            </p>
          </div>

          {/* Ikhtisar */}
          <section className="mb-8">
            <h3 className="mb-3 font-display text-sm font-bold text-yellow-300">1. Ikhtisar Keuangan</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {data.highlights.map((h) => (
                <div key={h.label} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                  <p className="text-xs text-slate-400">{h.label}</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-100">{h.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Analisis & pembahasan */}
          <section className="mb-8">
            <h3 className="mb-3 font-display text-sm font-bold text-yellow-300">2. Analisis & Pembahasan Manajemen</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
              {data.analysis.narrative.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.analysis.ratios.map((r) => (
                <div key={r.label} className="rounded-lg border border-slate-800 px-3 py-2 text-xs">
                  <span className="text-slate-400">{r.label}: </span>
                  <span className="font-mono text-slate-200">{r.value === null ? "N/A" : r.value.toFixed(2)}</span>
                  <span className="ml-1 text-slate-500">({r.verdict})</span>
                </div>
              ))}
            </div>
          </section>

          {/* Analisa pajak */}
          <section className="mb-8">
            <h3 className="mb-3 font-display text-sm font-bold text-yellow-300">3. Analisa Pajak & Tax Ratio</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
              {data.taxAnalysis.narrative.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </section>

          {/* Laporan keuangan */}
          <section className="mb-8">
            <h3 className="mb-3 font-display text-sm font-bold text-yellow-300">4. Laporan Keuangan</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <StmtBlock title="LAPORAN LABA RUGI" lines={data.statements.labaRugi.lines} />
              <StmtBlock title="NERACA" lines={data.statements.neraca.lines} />
              <StmtBlock title="LAPORAN PERUBAHAN EKUITAS" lines={data.statements.ekuitas.lines} />
              <StmtBlock title="LAPORAN ARUS KAS" lines={data.statements.arusKas.lines} />
            </div>
          </section>

          {/* CALK */}
          <section className="mb-8">
            <h3 className="mb-3 font-display text-sm font-bold text-yellow-300">5. Catatan atas Laporan Keuangan</h3>
            <div className="space-y-4">
              {data.calk.sections.map((s) => (
                <div key={s.number}>
                  <h4 className="mb-1 text-sm font-semibold text-slate-100">
                    {s.number}. {s.title}
                  </h4>
                  {s.paragraphs.map((p, i) => (
                    <p key={i} className="text-xs leading-relaxed text-slate-400">
                      {p}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Pernyataan tanggung jawab */}
          <section className="rounded-xl border border-slate-800 p-5 text-center">
            <h3 className="mb-2 font-display text-sm font-bold text-yellow-300">6. Pernyataan Tanggung Jawab</h3>
            <p className="text-xs text-slate-400">
              Laporan keuangan di atas telah disusun sesuai SAK ETAP dan merupakan tanggung jawab manajemen entitas.
            </p>
          </section>
        </Card>
      )}
    </div>
  );
}

// ── Helpers bersama ──────────────────────────────────────────────────────────
