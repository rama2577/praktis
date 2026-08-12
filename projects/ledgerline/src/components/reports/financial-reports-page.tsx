"use client";

import { useState } from "react";
import { FinancialStatementsView } from "@/components/reports/financial-statements-view";
import { AnalysisView, CalkView, TaxAnalysisView, AnnualReportView } from "@/components/reports/analytics-views";
import { MultiPeriodView } from "@/components/reports/multi-period-view";

type Client = { id: string; name: string };

const TABS = [
  { key: "ikhtisar", label: "Ikhtisar" },
  { key: "laporan", label: "Laporan" },
  { key: "analisa", label: "Analisa" },
  { key: "calk", label: "CALK" },
  { key: "pajak", label: "Analisa Pajak" },
  { key: "penyampaian", label: "Penyampaian" },
] as const;

export function FinancialReportsPage({ initialClients = [] }: { initialClients?: Client[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("ikhtisar");
  const [clientId, setClientId] = useState(initialClients[0]?.id ?? "");
  const [period, setPeriod] = useState("2026-08");

  const shared = { clients: initialClients, period, clientId, setClientId, setPeriod };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-100">Laporan Keuangan</h1>
        <p className="text-sm text-slate-400">
          Laporan akhir (SAK ETAP) + analisa: rasio & grafik, CALK, analisa pajak (tax ratio), dan dokumen penyampaian.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-yellow-400/20 text-yellow-300 ring-1 ring-yellow-400/40"
                : "border border-slate-700 text-slate-300 hover:border-yellow-400/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ikhtisar" && <MultiPeriodView {...shared} />}
      {tab === "laporan" && <FinancialStatementsView initialClients={initialClients} />}
      {tab === "analisa" && <AnalysisView {...shared} />}
      {tab === "calk" && <CalkView {...shared} />}
      {tab === "pajak" && <TaxAnalysisView {...shared} />}
      {tab === "penyampaian" && <AnnualReportView {...shared} />}
    </div>
  );
}
