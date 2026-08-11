"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
const rp = (n: number) => `Rp${fmt(n)}`;

type Client = { id: string; name: string };

function useAnalytics<T>(clientId: string, period: string, scope: string, enabled: boolean) {
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

function RatioCard({ r }: { r: { label: string; value: number | null; formula: string; benchmark: string; verdict: string; note: string } }) {
  const tone = r.verdict === "BAIK" ? "positive" : r.verdict === "WASPADA" ? "warning" : r.verdict === "KURANG" ? "danger" : "neutral";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-200">{r.label}</p>
        <Badge label={r.verdict} tone={tone as "positive" | "danger" | "neutral" | "warning"} />
      </div>
      <p className="mt-2 font-mono text-xl text-slate-100">{r.value === null ? "N/A" : r.value.toFixed(2)}</p>
      <p className="mt-1 text-xs text-slate-500">{r.formula}</p>
      <p className="text-xs text-slate-500">Benchmark: {r.benchmark}</p>
      <p className="mt-2 text-xs text-slate-400">{r.note}</p>
    </div>
  );
}

function BarChart({ series, color }: { series: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <div className="space-y-2">
      {series.map((s) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className="w-40 truncate text-xs text-slate-400" title={s.label}>
            {s.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-slate-800">
            <div
              className="h-full rounded transition-all"
              style={{ width: `${Math.max((Math.abs(s.value) / max) * 100, 2)}%`, backgroundColor: color }}
            />
          </div>
          <span className="w-28 text-right font-mono text-xs text-slate-300">{rp(s.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Analisa (rasio + grafik + narasi) ────────────────────────────────────────

type AnalysisData = {
  clientName: string;
  period: string;
  ratios: {
    key: string;
    label: string;
    value: number | null;
    formula: string;
    benchmark: string;
    verdict: string;
    note: string;
  }[];
  charts: {
    komposisiAset: { label: string; value: number; color: string }[];
    pendapatanVsBeban: { pendapatan: number; beban: number };
    kontribusiPendapatan: { label: string; value: number; color: string }[];
    kontribusiBeban: { label: string; value: number; color: string }[];
  };
  narrative: string[];
};

export function AnalysisView({ clients, period, clientId, setClientId, setPeriod }: {
  clients: Client[];
  period: string;
  clientId: string;
  setClientId: (v: string) => void;
  setPeriod: (v: string) => void;
}) {
  const { data, loading, error, reload } = useAnalytics<AnalysisData>(clientId, period, "analysis", !!clientId);
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
          <Card className="p-5">
            <h3 className="mb-3 font-display text-sm font-bold text-slate-100">Analisa Manajemen (otomatis)</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
              {data.narrative.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </Card>
          <div>
            <h3 className="mb-3 font-display text-sm font-bold text-slate-100">Rasio Keuangan</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.ratios.map((r) => (
                <RatioCard key={r.key} r={r} />
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-200">Komposisi Aset</h3>
              <BarChart series={data.charts.komposisiAset} color="#f5c518" />
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-200">Pendapatan vs Beban</h3>
              <div className="flex h-40 items-end gap-6 px-4">
                {[
                  { label: "Pendapatan", value: data.charts.pendapatanVsBeban.pendapatan, color: "#34d399" },
                  { label: "Beban", value: data.charts.pendapatanVsBeban.beban, color: "#fb7185" },
                ].map((b) => {
                  const max = Math.max(data.charts.pendapatanVsBeban.pendapatan, data.charts.pendapatanVsBeban.beban, 1);
                  return (
                    <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                      <span className="font-mono text-xs text-slate-300">{rp(b.value)}</span>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{ height: `${Math.max((b.value / max) * 100, 3)}%`, backgroundColor: b.color }}
                      />
                      <span className="text-xs text-slate-400">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-200">Kontribusi Pendapatan</h3>
              <BarChart series={data.charts.kontribusiPendapatan} color="#38bdf8" />
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-200">Kontribusi Beban</h3>
              <BarChart series={data.charts.kontribusiBeban} color="#fb7185" />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ── CALK ─────────────────────────────────────────────────────────────────────

type CalkData = {
  clientName: string;
  period: string;
  sections: { number: number; title: string; paragraphs: string[]; items?: { label: string; value: string }[] }[];
};

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
          href={clientId ? `/api/clients/${clientId}/analytics?period=${period}&scope=calk&format=md` : "#"}
          className={`rounded-lg border border-slate-700 px-3 py-2 text-sm transition ${
            clientId ? "text-slate-200 hover:border-yellow-400/50 hover:text-yellow-300" : "pointer-events-none opacity-40"
          }`}
        >
          ↓ Markdown
        </a>
        <a
          href={clientId ? `/api/clients/${clientId}/analytics?period=${period}&scope=calk&format=csv` : "#"}
          className={`rounded-lg border border-slate-700 px-3 py-2 text-sm transition ${
            clientId ? "text-slate-200 hover:border-yellow-400/50 hover:text-yellow-300" : "pointer-events-none opacity-40"
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
            <h2 className="font-display text-lg font-bold text-slate-100">CATATAN ATAS LAPORAN KEUANGAN</h2>
            <p className="text-sm text-slate-400">
              {data.clientName} — Periode yang berakhir {data.period}
            </p>
          </div>
          <div className="space-y-6">
            {data.sections.map((s) => (
              <section key={s.number}>
                <h3 className="mb-2 text-sm font-bold text-yellow-300">
                  {s.number}. {s.title}
                </h3>
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="mb-2 text-sm leading-relaxed text-slate-300">
                    {p}
                  </p>
                ))}
                {s.items && (
                  <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                    {s.items.map((it) => (
                      <div key={it.label} className="flex justify-between gap-3 border-b border-slate-800 py-1 text-sm">
                        <dt className="text-slate-400">{it.label}</dt>
                        <dd className="font-mono text-slate-200">{it.value}</dd>
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
              <p className="text-xs text-slate-400">Tax Ratio</p>
              <p className="mt-1 font-mono text-2xl text-yellow-300">
                {data.taxRatio.value === null ? "N/A" : `${(data.taxRatio.value * 100).toFixed(1)}%`}
              </p>
              <p className="mt-1 text-xs text-slate-500">{data.taxRatio.formula}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-400">PPN Kurang Bayar</p>
              <p className="mt-1 font-mono text-2xl text-slate-100">{rp(Math.max(data.ppn.kurangBayar, 0))}</p>
              <p className="mt-1 text-xs text-slate-500">{data.ppn.note}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-400">Total PPh</p>
              <p className="mt-1 font-mono text-2xl text-slate-100">{rp(data.pph.totalPPh)}</p>
              <p className="mt-1 text-xs text-slate-500">{data.pph.note}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-400">Effective Tax Rate</p>
              <p className="mt-1 font-mono text-2xl text-slate-100">
                {data.pph.effectiveTaxRate === null ? "N/A" : `${(data.pph.effectiveTaxRate * 100).toFixed(1)}%`}
              </p>
              <p className="mt-1 text-xs text-slate-500">Total PPh ÷ laba</p>
            </Card>
          </div>
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-medium text-slate-200">Rincian Pajak</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="px-3 py-2">Pos</th>
                    <th className="px-3 py-2 text-right">Nilai</th>
                    <th className="px-3 py-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((b) => (
                    <tr key={b.label} className="border-b border-slate-800/60 text-slate-300">
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
            <h3 className="mb-3 text-sm font-medium text-slate-200">Analisa Pajak</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
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
          href={clientId ? `/api/clients/${clientId}/analytics?period=${period}&scope=annual&format=md` : "#"}
          className={`rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-300 transition hover:bg-yellow-400/20 ${
            clientId ? "" : "pointer-events-none opacity-40"
          }`}
        >
          ↓ Unduh Dokumen (.md)
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

function SelectClient({ clients, clientId, setClientId }: { clients: Client[]; clientId: string; setClientId: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      Klien
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PeriodInput({ period, setPeriod }: { period: string; setPeriod: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      Periode
      <input
        type="month"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
      />
    </label>
  );
}

export function EmptyAnalytics() {
  return <EmptyState title="Pilih klien & periode" description="Analisa dihitung dari jurnal yang disetujui." />;
}
