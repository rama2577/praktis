"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TH, TD, TR, Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

type MutationRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  matchStatus: "UNMATCHED" | "MATCHED" | "MANUAL";
  matchedJournalId: string | null;
  matchScore: number | null;
};

type CashJournalLine = {
  journalId: string;
  entryDate: string;
  description: string | null;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

type Suggestion = {
  mutationId: string;
  mutationDescription: string;
  mutationAmount: number;
  journalId: string;
  journalDescription: string | null;
  score: number;
  reason: string;
};

type Summary = {
  period: string;
  totalMutations: number;
  totalMatched: number;
  bankIn: number;
  bankOut: number;
  bookIn: number;
  bookOut: number;
  outstandingMutations: { id: string; date: string; description: string; amount: number }[];
  outstandingJournals: { journalId: string; date: string; description: string | null; amount: number }[];
};

type Client = { id: string; name: string };

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const money = (n: number) => (n >= 0 ? fmt(n) : `-${fmt(Math.abs(n))}`);

export function ReconView({ initialClients = [] }: { initialClients?: Client[] }) {
  const clients = initialClients;
  const [clientId, setClientId] = useState(initialClients[0]?.id ?? "");
  const [period, setPeriod] = useState("2026-07");
  const [data, setData] = useState<{
    clientName: string;
    mutations: MutationRow[];
    journals: CashJournalLine[];
    suggestions: Suggestion[];
    summary: Summary;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/recon?period=${period}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal memuat rekonsiliasi.");
      setData(j.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId, period]);

  useEffect(() => {
    if (!clientId) return;
    async function start() {
      await load();
    }
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, period]);

  const suggestionByMutation = useMemo(() => {
    const map = new Map<string, Suggestion>();
    for (const s of data?.suggestions ?? []) map.set(s.mutationId, s);
    return map;
  }, [data]);

  const applySuggestion = async (mutationId: string, journalId: string | null) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/recon/mutations/${mutationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchedJournalId: journalId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan match.");
      setNotice(journalId ? "Match disimpan." : "Match dilepas.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applyAllSuggestions = async () => {
    setBusy(true);
    setNotice(null);
    try {
      let applied = 0;
      for (const s of data?.suggestions ?? []) {
        const res = await fetch(`/api/clients/${clientId}/recon/mutations/${s.mutationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchedJournalId: s.journalId }),
        });
        if (res.ok) applied += 1;
      }
      setNotice(`${applied} saran AI diterapkan.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/recon/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menyelesaikan rekonsiliasi.");
      setNotice(j.message ?? "Rekonsiliasi diproses.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    if (!clientId) return;
    window.location.href = `/api/clients/${clientId}/recon/export?period=${period}&format=csv`;
  };

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Rekonsiliasi Bank</h1>
        <p className="text-sm text-slate-700">
          Cocokkan mutasi bank dengan jurnal kas (1-1000/1-1100), bantuan saran AI, dan laporan outstanding.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Klien
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Periode
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          Muat
        </Button>
        <Button variant="secondary" onClick={exportCsv} disabled={!data}>
          ↓ Laporan CSV
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-600">
          {notice}
        </div>
      )}
      {error && <ErrorState message={error} />}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && data && s && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-slate-700">Mutasi bank</div>
              <div className="font-display text-xl font-bold text-slate-900">
                {s.totalMutations} <span className="text-xs font-normal text-slate-700">({s.totalMatched} tercocok)</span>
              </div>
              <div className="mt-1 text-xs text-slate-700">
                Masuk {fmt(s.bankIn)} · Keluar {fmt(s.bankOut)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-700">Buku kas (jurnal)</div>
              <div className="font-display text-xl font-bold text-slate-900">
                {s.outstandingJournals.length} <span className="text-xs font-normal text-slate-700">belum di bank</span>
              </div>
              <div className="mt-1 text-xs text-slate-700">
                Masuk {fmt(s.bookIn)} · Keluar {fmt(s.bookOut)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-700">Outstanding mutasi</div>
              <div className="font-display text-xl font-bold text-accent">{s.outstandingMutations.length}</div>
              <div className="mt-1 text-xs text-slate-700">Mutasi bank tanpa jurnal</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-700">Selisih</div>
              <div className={`font-display text-xl font-bold ${s.bankIn - s.bankOut === s.bookIn - s.bookOut ? "text-emerald-600" : "text-rose-600"}`}>
                {money((s.bankIn - s.bankOut) - (s.bookIn - s.bookOut))}
              </div>
              <div className="mt-1 text-xs text-slate-700">Bank − Buku periode {s.period}</div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ai" onClick={() => void applyAllSuggestions()} disabled={busy || (data.suggestions.length === 0)}>
              ✨ Terapkan Saran AI ({data.suggestions.length})
            </Button>
            <Button variant="secondary" onClick={() => void finish()} disabled={busy}>
              Selesaikan Rekonsiliasi
            </Button>
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-900">Mutasi Bank — {data.clientName}</h2>
              <Badge label={s.period} />
            </div>
            {data.mutations.length === 0 ? (
              <EmptyState title="Belum ada mutasi" description="Impor mutasi lewat API POST /recon/mutations." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <TR>
                      <TH>Tanggal</TH>
                      <TH>Deskripsi</TH>
                      <TH className="text-right">Masuk</TH>
                      <TH className="text-right">Keluar</TH>
                      <TH>Status</TH>
                      <TH>Saran AI</TH>
                    </TR>
                  </thead>
                  <tbody>
                    {data.mutations.map((m) => {
                      const sug = suggestionByMutation.get(m.id);
                      return (
                        <TR key={m.id}>
                          <TD className="whitespace-nowrap">{m.date.slice(0, 10)}</TD>
                          <TD>{m.description}</TD>
                          <TD className="text-right text-emerald-600">{m.amount > 0 ? fmt(m.amount) : ""}</TD>
                          <TD className="text-right text-rose-600">{m.amount < 0 ? fmt(Math.abs(m.amount)) : ""}</TD>
                          <TD>
                            {m.matchStatus === "UNMATCHED" ? (
                              <StatusBadge label="Belum cocok" tone="neutral" />
                            ) : (
                              <StatusBadge label={m.matchStatus === "MANUAL" ? "Manual" : "Cocok"} tone="positive" />
                            )}
                          </TD>
                          <TD>
                            {m.matchStatus === "UNMATCHED" && sug ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-accent" title={sug.reason}>
                                  {Math.round(sug.score * 100)}% · {sug.journalDescription ?? sug.journalId.slice(-6)}
                                </span>
                                <Button size="sm" variant="secondary" onClick={() => void applySuggestion(m.id, sug.journalId)} disabled={busy}>
                                  Cocokkan
                                </Button>
                              </div>
                            ) : m.matchStatus !== "UNMATCHED" ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-700">
                                  {m.matchedJournalId ? `→ ${m.matchedJournalId.slice(-6)}` : ""}
                                </span>
                                <Button size="sm" variant="ghost" onClick={() => void applySuggestion(m.id, null)} disabled={busy}>
                                  Lepas
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-700">—</span>
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-display text-base font-semibold text-slate-900">Outstanding — Jurnal Kas Tanpa Mutasi</h2>
            {s.outstandingJournals.length === 0 ? (
              <EmptyState title="Semua tercocok" description="Tidak ada jurnal kas yang belum punya mutasi." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <TR>
                      <TH>Tanggal</TH>
                      <TH>Deskripsi</TH>
                      <TH className="text-right">Jumlah</TH>
                    </TR>
                  </thead>
                  <tbody>
                    {s.outstandingJournals.map((j) => (
                      <TR key={j.journalId}>
                        <TD className="whitespace-nowrap">{j.date.slice(0, 10)}</TD>
                        <TD>{j.description ?? j.journalId.slice(-6)}</TD>
                        <TD className="text-right">{money(j.amount)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}

      {!loading && !data && !error && (
        <EmptyState title="Pilih klien & periode" description="Tekan Muat untuk menampilkan rekonsiliasi." />
      )}
    </div>
  );
}
