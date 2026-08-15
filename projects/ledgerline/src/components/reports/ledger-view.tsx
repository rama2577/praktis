"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

type CorrectionKind = "angka" | "deskripsi" | "akun";

type LedgerAccountSummary = {
  accountCode: string;
  accountName: string;
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
};

type ClientOption = { id: string; name: string };

const CORRECTION_KIND_LABELS: Record<CorrectionKind, string> = {
  angka: "Penyesuaian angka",
  deskripsi: "Perubahan deskripsi",
  akun: "Perubahan akun (reclass)",
};

const TYPE_LABELS: Record<string, string> = {
  AI: "AI",
  MANUAL: "Manual",
  ADJUSTING: "Penyesuaian",
};

export function LedgerView({ canEdit = false }: { canEdit?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("clientId") ?? "";
  const accountCode = searchParams.get("accountCode") ?? "";
  const period = searchParams.get("period") ?? "";

  const [report, setReport] = useState<Report | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [allAccounts, setAllAccounts] = useState<LedgerAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State koreksi (reclass)
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [correctionKind, setCorrectionKind] = useState<CorrectionKind>("angka");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !period) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!accountCode) {
        // Mode seluruh akun
        const res = await fetch(`/api/clients/${clientId}/ledger?period=${period}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Gagal memuat buku besar");
        }
        const data = (await res.json()) as { data: { accounts: LedgerAccountSummary[] } };
        setAllAccounts(data.data.accounts);
        setReport(null);
      } else {
        const res = await fetch(
          `/api/clients/${clientId}/ledger?accountCode=${encodeURIComponent(accountCode)}&period=${period}`,
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Gagal memuat buku besar");
        }
        const data = (await res.json()) as { data: Report };
        setReport(data.data);
      }
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

  // Daftar klien untuk filter (tarik seluruh akun tanpa dari neraca percobaan).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) return;
        const body = (await res.json()) as { data?: ClientOption[] };
        if (!cancelled && Array.isArray(body.data)) setClients(body.data);
      } catch {
        /* daftar klien opsional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startEdit = async (entry: LedgerEntry) => {
    setEditing(entry);
    setEditLines([]);
    setCorrectionKind("angka");
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
        body: JSON.stringify({ lines, kind: correctionKind }),
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

  const applyFilter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const c = String(fd.get("clientId") ?? "");
    const p = String(fd.get("period") ?? "");
    if (c && p) {
      router.push(`/dashboard/reports/ledger?clientId=${encodeURIComponent(c)}&period=${encodeURIComponent(p)}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter klien + bulan (tarik seluruh akun tanpa dari neraca percobaan) */}
      <form onSubmit={applyFilter} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">Klien</span>
            <select
              name="clientId"
              defaultValue={clientId}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
            >
              <option value="">— Pilih klien —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">Bulan</span>
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f49ce]"
          >
            Tampilkan Buku Besar
          </button>
          {accountCode && (
            <Link
              href={`/dashboard/reports/ledger?clientId=${clientId}&period=${period}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-accent/50 hover:text-accent"
            >
              ← Seluruh akun
            </Link>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-accent/50 hover:text-accent"
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
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-700">
          Memuat buku besar…
        </div>
      )}

      {!loading && !error && !report && allAccounts.length === 0 && (
        <EmptyState
          title="Belum ada parameter"
          description="Pilih klien dan bulan di atas untuk menampilkan seluruh akun buku besar."
        />
      )}

      {!loading && !error && !report && allAccounts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-medium text-slate-900">Buku Besar — Seluruh Akun</h2>
            <p className="mt-0.5 text-xs text-slate-700">
              {clients.find((c) => c.id === clientId)?.name ?? "Klien"} · Periode {period} · {allAccounts.length}{" "}
              akun
            </p>
          </div>
          <Table>
            <THead>
              <TH>Kode</TH>
              <TH>Nama Akun</TH>
              <TH className="text-right">Jml Jurnal</TH>
              <TH className="text-right">Debit</TH>
              <TH className="text-right">Kredit</TH>
              <TH className="text-right">Saldo</TH>
            </THead>
            <TBody>
              {allAccounts.map((a) => (
                <TR key={a.accountCode}>
                  <TD className="font-mono text-slate-700">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/reports/ledger?clientId=${clientId}&accountCode=${encodeURIComponent(a.accountCode)}&period=${period}`,
                        )
                      }
                      className="text-slate-800 underline-offset-2 hover:text-accent hover:underline"
                    >
                      {a.accountCode}
                    </button>
                  </TD>
                  <TD className="text-slate-700">{a.accountName}</TD>
                  <TD className="text-right font-mono text-slate-700">{a.entryCount}</TD>
                  <TD className="text-right font-mono text-slate-700">{formatCurrencyRp(a.totalDebit)}</TD>
                  <TD className="text-right font-mono text-slate-700">{formatCurrencyRp(a.totalCredit)}</TD>
                  <TD className="text-right font-mono text-slate-900">{formatCurrencyRp(a.closingBalance)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {report && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-slate-900">
                  Buku Besar — {report.accountName}{" "}
                  <span className="font-mono text-slate-700">({report.accountCode})</span>
                </h2>
                <p className="mt-1 text-xs text-slate-700">
                  {report.clientName} · Periode {report.period} · {report.entries.length} jurnal · Saldo
                  akhir {formatCurrencyRp(report.closingBalance)}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/clients/${clientId}/ledger?accountCode=${encodeURIComponent(accountCode)}&period=${period}&format=csv`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 transition hover:border-accent/50 hover:text-accent"
                >
                  ↓ CSV
                </a>
                <a
                  href={`/api/clients/${clientId}/ledger?accountCode=${encodeURIComponent(accountCode)}&period=${period}&format=xlsx`}
                  className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent transition hover:bg-accent/20"
                >
                  ↓ XLSX
                </a>
              </div>
            </div>
          </div>

          {report.status === "CLOSED" && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
              Periode sudah dikunci — jurnal tidak bisa dikoreksi. Perbaikan hanya lewat{" "}
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
                      <span className="ml-2 text-xs text-slate-700">{e.reference}</span>
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
                          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 transition hover:border-accent/50 hover:text-accent"
                        >
                          Koreksi
                        </button>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <span className="text-slate-700">
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

      {/* Panel koreksi */}
      {editing && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Koreksi Jurnal</h3>
                <p className="text-xs text-slate-700">
                  {report.accountName} · {new Date(editing.entryDate).toLocaleDateString("id-ID")} ·{" "}
                  {editing.description ?? "—"} — edit lalu simpan (audit trail tercatat)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 text-slate-700 hover:text-slate-800"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="mb-3">
              <span className="mb-1 block text-xs font-medium text-slate-700">Jenis koreksi</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CORRECTION_KIND_LABELS) as CorrectionKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCorrectionKind(k)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      correctionKind === k
                        ? "border-accent bg-accent/10 font-medium text-accent"
                        : "border-slate-200 text-slate-700 hover:border-accent/50"
                    }`}
                  >
                    {CORRECTION_KIND_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {editLines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 text-sm">
                  <input
                    value={l.accountCode}
                    onChange={(e) => updateLine(i, { accountCode: e.target.value })}
                    placeholder="Kode akun"
                    className="col-span-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-800 focus:border-accent/50 focus:outline-none"
                  />
                  <input
                    value={l.accountName}
                    onChange={(e) => updateLine(i, { accountName: e.target.value })}
                    placeholder="Nama akun"
                    className="col-span-4 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-800 focus:border-accent/50 focus:outline-none"
                  />
                  <input
                    value={l.debit}
                    onChange={(e) => updateLine(i, { debit: e.target.value })}
                    placeholder="Debit"
                    inputMode="decimal"
                    className="col-span-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-mono text-slate-800 focus:border-accent/50 focus:outline-none"
                  />
                  <input
                    value={l.credit}
                    onChange={(e) => updateLine(i, { credit: e.target.value })}
                    placeholder="Kredit"
                    inputMode="decimal"
                    className="col-span-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-mono text-slate-800 focus:border-accent/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={editLines.length <= 2}
                    className="col-span-2 rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-700 hover:text-red-600 disabled:opacity-30"
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
                className="rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-700 hover:border-accent/50 hover:text-accent"
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
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1f49ce] disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Simpan Koreksi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
