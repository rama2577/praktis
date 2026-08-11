"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, THead, TH, TD, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatCurrencyRp } from "@/lib/format";

type Client = { id: string; name: string };
type Classification = "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN" | "LAINNYA";

type Row = {
  accountCode: string;
  accountName: string;
  classification: Classification;
  debit: number;
  credit: number;
  net: number;
  balance: number;
  normalBalance: "DEBIT" | "KREDIT" | null;
  unusual: boolean;
  unusualReason: string | null;
  prevBalance: number | null;
};

type Report = {
  clientId: string;
  clientName: string;
  period: string;
  prevPeriod: string | null;
  rows: Row[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  unusualCount: number;
  periodStatus: "OPEN" | "CLOSED";
};

const CLASS_TONE: Record<Classification, "neutral" | "accent" | "positive" | "danger"> = {
  ASET: "accent",
  LIABILITAS: "neutral",
  EKUITAS: "positive",
  PENDAPATAN: "positive",
  BEBAN: "danger",
  LAINNYA: "neutral",
};

const CLASS_LABELS: Record<Classification, string> = {
  ASET: "Aset",
  LIABILITAS: "Liabilitas",
  EKUITAS: "Ekuitas",
  PENDAPATAN: "Pendapatan",
  BEBAN: "Beban",
  LAINNYA: "Lainnya",
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function TrialBalanceView({ canLock = false }: { canLock?: boolean }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [period, setPeriod] = useState(currentMonth());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const router = useRouter();

  // Muat daftar klien sekali
  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Gagal memuat daftar klien");
      const data = (await res.json()) as { data: Client[] };
      setClients(data.data);
      if (data.data.length > 0) setClientId(data.data[0].id);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    async function start() {
      await loadClients();
    }
    void start();
  }, [loadClients]);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/trial-balance?period=${period}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Gagal memuat neraca percobaan");
      }
      const data = (await res.json()) as { data: Report };
      setReport(data.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId, period]);

  useEffect(() => {
    async function start() {
      await load();
    }
    void start();
  }, [load]);

  const exportUrl = (format: "csv" | "xlsx") =>
    clientId ? `/api/clients/${clientId}/trial-balance?period=${period}&format=${format}` : null;

  const handleLock = async () => {
    if (!clientId || !report || report.periodStatus !== "OPEN") return;
    if (!window.confirm("Kunci periode ini? Jurnal APPROVED akan menjadi FINALIZED dan tidak bisa diedit langsung — perbaikan hanya lewat jurnal penyesuaian.")) return;
    setLocking(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/periods/${period}/lock`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Gagal mengunci periode");
      }
      const data = (await res.json()) as { data: { status: string; finalized: number } };
      setReport({ ...report, periodStatus: data.data.status as "OPEN" | "CLOSED" });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Klien
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setReport(null);
            }}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-yellow-400/50 focus:outline-none"
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
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-yellow-400/50 focus:outline-none"
          />
        </label>
        <a
          href={exportUrl("csv") ?? "#"}
          aria-disabled={!clientId}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            clientId
              ? "border-slate-700 text-slate-200 hover:border-yellow-400/50 hover:text-yellow-300"
              : "pointer-events-none opacity-40"
          }`}
        >
          ↓ Ekspor CSV
        </a>
        <a
          href={exportUrl("xlsx") ?? "#"}
          aria-disabled={!clientId}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            clientId
              ? "border-slate-700 text-slate-200 hover:border-yellow-400/50 hover:text-yellow-300"
              : "pointer-events-none opacity-40"
          }`}
        >
          ↓ Ekspor XLSX
        </a>
        {report?.periodStatus === "OPEN" && canLock && (
          <button
            type="button"
            onClick={() => void handleLock()}
            disabled={locking}
            className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-300 transition hover:bg-yellow-400/20 disabled:opacity-50"
          >
            {locking ? "Mengunci…" : "🔒 Kunci Periode"}
          </button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
          Menghitung neraca percobaan…
        </div>
      )}

      {!loading && !error && !report && (
        <EmptyState
          title="Belum ada data"
          description="Pilih klien dan periode untuk melihat neraca percobaan."
        />
      )}

      {!loading && !error && report && (
        <>
          {/* Ringkasan */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Total Debit</p>
              <p className="mt-1 font-mono text-lg text-slate-100">{formatCurrencyRp(report.totalDebit)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Total Kredit</p>
              <p className="mt-1 font-mono text-lg text-slate-100">{formatCurrencyRp(report.totalCredit)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Status Seimbang</p>
              <div className="mt-2">
                {report.balanced ? (
                  <Badge label="✓ Seimbang" tone="positive" />
                ) : (
                  <Badge label="Tidak seimbang" tone="danger" />
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Indikator Kewajaran</p>
              <div className="mt-2">
                {report.unusualCount === 0 ? (
                  <Badge label="Semua wajar" tone="positive" />
                ) : (
                  <Badge label={`${report.unusualCount} akun perlu cek`} tone="danger" />
                )}
              </div>
            </div>
          </div>

          {/* Tabel */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <h3 className="text-sm font-medium text-slate-100">
                  Neraca Percobaan — {report.clientName}
                </h3>
                <p className="text-xs text-slate-400">
                  Periode {report.period}
                  {report.prevPeriod ? ` · komparatif vs ${report.prevPeriod}` : ""} · {report.rows.length} akun
                </p>
              </div>
              <div className="flex items-center gap-2">
                {report.periodStatus === "CLOSED" ? (
                  <Badge label="🔒 Periode terkunci" tone="accent" />
                ) : (
                  <Badge label="Periode terbuka" tone="positive" />
                )}
              </div>
            </div>
            <Table>
              <THead>
                <TH>Kode</TH>
                <TH>Akun</TH>
                <TH>Klasifikasi</TH>
                <TH className="text-right">Debit</TH>
                <TH className="text-right">Kredit</TH>
                <TH className="text-right">Saldo</TH>
                <TH className="text-right">
                  Bulan Lalu
                  {report.prevPeriod ? ` (${report.prevPeriod})` : ""}
                </TH>
                <TH>Indikator</TH>
              </THead>
              <TBody>
                {report.rows.map((r) => (
                  <TR key={r.accountCode} className={r.unusual ? "bg-red-950/20" : undefined}>
                    <TD className="font-mono">
                      <Link
                        href={`/dashboard/reports/ledger?clientId=${report.clientId}&accountCode=${encodeURIComponent(r.accountCode)}&period=${report.period}`}
                        className="text-yellow-300/90 underline-offset-2 hover:underline"
                        title={`Buku besar ${r.accountName}`}
                      >
                        {r.accountCode}
                      </Link>
                    </TD>
                    <TD>{r.accountName}</TD>
                    <TD>
                      <Badge label={CLASS_LABELS[r.classification]} tone={CLASS_TONE[r.classification]} />
                    </TD>
                    <TD className="text-right font-mono text-slate-300">
                      {r.debit > 0 ? formatCurrencyRp(r.debit) : "—"}
                    </TD>
                    <TD className="text-right font-mono text-slate-300">
                      {r.credit > 0 ? formatCurrencyRp(r.credit) : "—"}
                    </TD>
                    <TD className="text-right font-mono text-slate-100">{formatCurrencyRp(r.balance)}</TD>
                    <TD className="text-right font-mono text-slate-400">
                      {r.prevBalance === null ? "—" : formatCurrencyRp(r.prevBalance)}
                    </TD>
                    <TD>
                      {r.unusualReason && (
                        <span className="text-xs text-red-300" title={r.unusualReason}>
                          ⚠ {r.unusualReason}
                        </span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex justify-between border-t border-slate-800 px-4 py-3 text-sm">
              <span className="text-slate-400">Total</span>
              <span className="font-mono text-slate-200">
                {formatCurrencyRp(report.totalDebit)} = {formatCurrencyRp(report.totalCredit)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
