"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
const rp = (n: number) => `Rp${fmt(n)}`;

type Client = { id: string; name: string };

import { useAnalytics, type AnalysisData, BarChart, RatioCard, SelectClient, PeriodInput } from "./analytics-views";
import type { VarianceDecomposition } from "@/server/variance-decomposition";

export function AnalysisView({ clients, period, clientId, setClientId, setPeriod }: {
  clients: Client[];
  period: string;
  clientId: string;
  setClientId: (v: string) => void;
  setPeriod: (v: string) => void;
}) {
  const { data: variance } = useAnalytics<VarianceDecomposition>(clientId, period, "variance", !!clientId);
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
            <h3 className="mb-3 font-display text-sm font-bold text-slate-900">Analisa Manajemen (otomatis)</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              {data.narrative.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </Card>
          <div>
            <h3 className="mb-3 font-display text-sm font-bold text-slate-900">Rasio Keuangan</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.ratios.map((r) => (
                <RatioCard key={r.key} r={r} />
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-800">Komposisi Aset</h3>
              <BarChart series={data.charts.komposisiAset} color="#f5c518" />
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-800">Pendapatan vs Beban</h3>
              <div className="flex h-40 items-end gap-6 px-4">
                {[
                  { label: "Pendapatan", value: data.charts.pendapatanVsBeban.pendapatan, color: "#34d399" },
                  { label: "Beban", value: data.charts.pendapatanVsBeban.beban, color: "#fb7185" },
                ].map((b) => {
                  const max = Math.max(data.charts.pendapatanVsBeban.pendapatan, data.charts.pendapatanVsBeban.beban, 1);
                  return (
                    <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                      <span className="font-mono text-xs text-slate-700">{rp(b.value)}</span>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{ height: `${Math.max((b.value / max) * 100, 3)}%`, backgroundColor: b.color }}
                      />
                      <span className="text-xs text-slate-700">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-800">Kontribusi Pendapatan</h3>
              <BarChart series={data.charts.kontribusiPendapatan} color="#38bdf8" />
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-800">Kontribusi Beban</h3>
              <BarChart series={data.charts.kontribusiBeban} color="#fb7185" />
            </Card>
          </div>
          {/* AI Variance Decomposition */}
          {variance && (
            <Card className="border-accent/20 bg-accent/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-slate-900">🤖 Analisis Varians AI</h3>
                <Badge label={`${variance.currentPeriod} vs ${variance.priorPeriod}`} tone="accent" />
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{variance.narrative}</p>
              {variance.keyDrivers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {variance.keyDrivers.map((d, i) => (
                    <span key={i} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">{d}</span>
                  ))}
                </div>
              )}
            </Card>
          )}
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
