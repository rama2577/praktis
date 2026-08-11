"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

type Client = { id: string; name: string };

type StatementLine = { label: string; amount: number; indent?: number; bold?: boolean };
type Statement = { title: string; clientName: string; period: string; lines: StatementLine[] };

const TABS = [
  { value: "labarugi", label: "Laba Rugi" },
  { value: "neraca", label: "Neraca" },
  { value: "ekuitas", label: "Perubahan Ekuitas" },
  { value: "aruskas", label: "Arus Kas" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export function FinancialStatementsView({ initialClients = [] }: { initialClients?: Client[] }) {
  const clients = initialClients;
  const [clientId, setClientId] = useState(initialClients[0]?.id ?? "");
  const [period, setPeriod] = useState("2026-08");
  const [tab, setTab] = useState("labarugi");
  const [stmt, setStmt] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/financial-statements?period=${period}&type=${tab}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal memuat laporan.");
      setStmt(j.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId, period, tab]);

  useEffect(() => {
    async function start() {
      await load();
    }
    void start();
  }, [load]);

  const exportCsv = () => {
    if (!clientId) return;
    window.location.href = `/api/clients/${clientId}/financial-statements?period=${period}&type=${tab}&format=csv`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-100">Laporan Keuangan</h1>
        <p className="text-sm text-slate-400">
          Laporan akhir format Indonesia (SAK ETAP): Laba Rugi, Neraca, Perubahan Ekuitas, Arus Kas — dari jurnal APPROVED/FINALIZED.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
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
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Periode
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.value
                  ? "bg-yellow-400/20 text-yellow-300 ring-1 ring-yellow-400/40"
                  : "border border-slate-700 text-slate-300 hover:border-yellow-400/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={!stmt}>
          ↓ CSV
        </Button>
      </div>

      {error && <ErrorState message={error} />}

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : stmt ? (
        <Card className="p-6">
          <div className="mb-4 text-center">
            <h2 className="font-display text-lg font-bold text-slate-100">{stmt.title}</h2>
            <p className="text-sm text-slate-400">
              {stmt.clientName} — Periode {stmt.period}
            </p>
          </div>
          <div className="mx-auto max-w-xl space-y-1">
            {stmt.lines.map((l, i) => (
              <div
                key={i}
                className={`flex items-baseline justify-between gap-4 rounded px-2 py-1 ${
                  l.bold ? "border-t border-slate-800 font-semibold text-slate-100" : "text-slate-300"
                }`}
                style={{ paddingLeft: `${16 + (l.indent ?? 0) * 20}px` }}
              >
                <span className="text-sm">{l.label}</span>
                <span className={`whitespace-nowrap text-sm ${l.amount < 0 ? "text-rose-300" : ""}`}>{fmt(l.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState title="Pilih klien & periode" description="Laporan dihitung dari jurnal yang disetujui (APPROVED/FINALIZED)." />
      )}
    </div>
  );
}
