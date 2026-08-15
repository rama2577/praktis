"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, THead, TH, TD, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatCurrencyRp } from "@/lib/format";

type LedgerEntry = {
  journalId: string;
  entryDate: string;
  description: string | null;
  journalType: string;
  status: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
};

type Report = {
  clientId: string;
  clientName: string;
  accountCode: string;
  accountName: string;
  period: string;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  status: "OPEN" | "CLOSED";
};

type EditLine = { accountCode: string; accountName: string; debit: string; credit: string; notes: string };

const TYPE_LABELS: Record<string, string> = {
  AI: "AI",
  MANUAL: "Manual",
  ADJUSTING: "Penyesuaian",
};

export function LedgerView({ canEdit = false }: { canEdit?: boolean }) {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? "";
  const accountCode = searchParams.get("accountCode") ?? "";
  const period = searchParams.get("period") ?? "";

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State reclass
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !accountCode || !period) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/clients/${clientId}/ledger?accountCode=${encodeURIComponent(accountCode)}&period=${period}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Gagal memuat buku besar");
      }
      const data = (await res.json()) as { data: Report };
      setReport(data.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId, accountCode, period]);

  useEffect(() => {
    async function start() {
      await load();
    }
    void start();
  }, [load]);

  const startEdit = async (entry: LedgerEntry) => {
    setEditing(entry);
    setEditLines([]);
    try {
      const res = await fetch(`/api/journals/${entry.journalId}`);
      if (!res.ok) throw new Error("Gagal memuat detail jurnal");
      const data = (await res.json()) as {
        data: { lines: Array<{ accountCode: string; accountName: string; debit: number; credit: number; notes: string | null }> };
      };
      setEditLines(
        data.data.lines.map((l) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          debit: l.debit > 0 ? String(l.debit) : "",
          credit: l.credit > 0 ? String(l.credit) : "",
          notes: l.notes ?? "",
        })),
      );
    } catch (e) {
      setError((e as Error).message);
      setEditing(null);
    }
  };

  const addLine = () => {
    setEditLines((prev) => [
      ...prev,
      { accountCode: "", accountName: "", debit: "", credit: "", notes: "" },
    ]);
  };

  const updateLine = (i: number, patch: Partial<EditLine>) => {
    setEditLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const removeLine = (i: number) => {
    setEditLines((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));
  };

  const totals = editLines.reduce(
    (acc, l) => {
      const d = Number(l.debit) || 0;
      const c = Number(l.credit) || 0;
      return { debit: acc.debit + d, credit: acc.credit + c };
    },
    { debit: 0, credit: 0 },
  );
  const balanced = Math.abs(totals.debit - totals.credit) < 0.005;

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const lines = editLines.map((l) => ({
        accountCode: l.accountCode.trim(),
        accountName: l.accountName.trim(),
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        notes: l.notes.trim() || null,
      }));
      const res = await fetch(`/api/journals/${editing.journalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Gagal menyimpan reclass");
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const backHref = `/dashboard/reports/trial-balance${clientId && period ? `?clientId=${clientId}&period=${period}` : ""}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-yellow-400/50 hover:text-amber-600"
        >
          ← Kembali ke Neraca Percobaan
        </Link>
        {report && (
          <div className="flex items-center gap-2">
            {report.status === "CLOSED" ? (
              <Badge label="🔒 Periode terkunci" tone="accent" />
            ) : (
              <Badge label="Periode terbuka" tone="positive" />
            )}
          </div>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Memuat buku besar…
        </div>
      )}

      {!loading && !error && !report && (
        <EmptyState
          title="Parameter tidak lengkap"
          description="Buka buku besar dari halaman Neraca Percobaan dengan mengklik kode akun."
        />
      )}

      {report && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-slate-900">
                  Buku Besar — {report.accountName}{" "}
                  <span className="font-mono text-slate-600">({report.accountCode})</span>
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  {report.clientName} · Periode {report.period} · {report.entries.length} jurnal · Saldo
                  akhir {formatCurrencyRp(report.closingBalance)}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/clients/${clientId}/ledger?accountCode=${encodeURIComponent(accountCode)}&period=${period}&format=csv`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 transition hover:border-yellow-400/50 hover:text-amber-600"
                >
                  ↓ CSV
                </a>
                <a
                  href={`/api/clients/${clientId}/ledger?accountCode=${encodeURIComponent(accountCode)}&period=${period}&format=xlsx`}
                  className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm text-amber-600 transition hover:bg-yellow-400/20"
                >
                  ↓ XLSX
                </a>
              </div>
            </div>
          </div>

          {report.status === "CLOSED" && (
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 px-4 py-3 text-sm text-yellow-200">
              Periode sudah dikunci — jurnal tidak bisa di-reclass. Perbaikan hanya lewat{" "}
              <Link href="/dashboard/journals" className="underline">
                jurnal penyesuaian
              </Link>
              .
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white">
            <Table>
              <THead>
                <TH>Tanggal</TH>
                <TH>Deskripsi</TH>
                <TH>Tipe</TH>
                <TH className="text-right">Debit</TH>
                <TH className="text-right">Kredit</TH>
                <TH className="text-right">Saldo Berjalan</TH>
                {canEdit && report.status === "OPEN" && <TH className="text-right">Aksi</TH>}
              </THead>
              <TBody>
                {report.entries.map((e) => (
                  <TR key={e.journalId}>
                    <TD className="font-mono text-slate-700">
                      {new Date(e.entryDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TD>
                    <TD>
                      {e.description ?? "—"}
                      <span className="ml-2 text-xs text-slate-500">{e.reference}</span>
                    </TD>
                    <TD>
                      <Badge label={TYPE_LABELS[e.journalType] ?? e.journalType} tone="neutral" />
                    </TD>
                    <TD className="text-right font-mono text-slate-700">
                      {e.debit > 0 ? formatCurrencyRp(e.debit) : "—"}
                    </TD>
                    <TD className="text-right font-mono text-slate-700">
                      {e.credit > 0 ? formatCurrencyRp(e.credit) : "—"}
                    </TD>
                    <TD className="text-right font-mono text-slate-900">{formatCurrencyRp(e.balance)}</TD>
                    {canEdit && report.status === "OPEN" && (
                      <TD className="text-right">
                        <button
                          type="button"
                          onClick={() => void startEdit(e)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 transition hover:border-yellow-400/50 hover:text-amber-600"
                        >
                          Reclass
                        </button>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <span className="text-slate-600">
                Total debit {formatCurrencyRp(report.totalDebit)} · total kredit{" "}
                {formatCurrencyRp(report.totalCredit)}
              </span>
              <span className="font-mono text-slate-800">
                Saldo akhir {formatCurrencyRp(report.closingBalance)}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Panel reclass */}
      {editing && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Reclass Jurnal</h3>
                <p className="text-xs text-slate-600">
                  {report.accountName} · {new Date(editing.entryDate).toLocaleDateString("id-ID")} ·{" "}
                  {editing.description ?? "—"} — edit baris lalu simpan (audit trail tercatat)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 text-slate-600 hover:text-slate-800"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {editLines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 text-sm">
                  <input
                    value={l.accountCode}
                    onChange={(e) => updateLine(i, { accountCode: e.target.value })}
                    placeholder="Kode akun"
                    className="col-span-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-800 focus:border-yellow-400/50 focus:outline-none"
                  />
                  <input
                    value={l.accountName}
                    onChange={(e) => updateLine(i, { accountName: e.target.value })}
                    placeholder="Nama akun"
                    className="col-span-4 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-800 focus:border-yellow-400/50 focus:outline-none"
                  />
                  <input
                    value={l.debit}
                    onChange={(e) => updateLine(i, { debit: e.target.value })}
                    placeholder="Debit"
                    inputMode="decimal"
                    className="col-span-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-mono text-slate-800 focus:border-yellow-400/50 focus:outline-none"
                  />
                  <input
                    value={l.credit}
                    onChange={(e) => updateLine(i, { credit: e.target.value })}
                    placeholder="Kredit"
                    inputMode="decimal"
                    className="col-span-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-mono text-slate-800 focus:border-yellow-400/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={editLines.length <= 2}
                    className="col-span-2 rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:text-red-600 disabled:opacity-30"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={addLine}
                className="rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-700 hover:border-yellow-400/50 hover:text-amber-600"
              >
                + Tambah baris
              </button>
              <span className={balanced ? "text-emerald-600" : "text-red-600"}>
                {balanced
                  ? `✓ Seimbang (${formatCurrencyRp(totals.debit)})`
                  : `Belum seimbang: debit ${formatCurrencyRp(totals.debit)} ≠ kredit ${formatCurrencyRp(totals.credit)}`}
              </span>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving || !balanced || editLines.length < 2}
                className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Simpan Reclass"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
