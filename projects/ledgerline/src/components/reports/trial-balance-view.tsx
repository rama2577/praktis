"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

// ── Server-side type mirrors ─────────────────────────────────────────────────

type WorksheetLineSrv = {
  no: number;
  accountCode: string;
  accountName: string;
  ref: string;
  nsDebit: number; nsCredit: number;
  adjDebit: number; adjCredit: number;
  adjNsDebit: number; adjNsCredit: number;
  lrDebit: number; lrCredit: number;
  neracaDebit: number; neracaCredit: number;
  prevBalance: number | null;
  variance: number | null;
  variancePct: number | null;
  isAdjusting: boolean;
};

type WorksheetSrv = {
  clientName: string;
  period: string;
  prevPeriodLabel: string | null;
  lines: WorksheetLineSrv[];
  totals: {
    nsDebit: number; nsCredit: number;
    adjDebit: number; adjCredit: number;
    adjNsDebit: number; adjNsCredit: number;
    lrDebit: number; lrCredit: number;
    neracaDebit: number; neracaCredit: number;
  };
  labaBersih: number;
  balanced: boolean;
};

// ──────────────────────────────────────────────────────────────────────────────

export function TrialBalanceView({ canLock = false }: { canLock?: boolean }) {
  const [clientId, setClientId] = useState(""); // kosong = auto ke klien pertama
  const [period, setPeriod] = useState(currentMonth());
  const [mode, setMode] = useState<"standar" | "lajur">("lajur");
  const [lockError, setLockError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Gagal memuat daftar klien");
      return ((await res.json()) as { data: Client[] }).data;
    },
  });
  const clients = clientsData ?? [];
  const effectiveClientId = clientId || clients[0]?.id || "";

  const reportKey = ["trial-balance", effectiveClientId, period];
  const { data: report, isLoading: loading, error, refetch } = useQuery({
    queryKey: reportKey,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${effectiveClientId}/trial-balance?period=${period}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Gagal memuat neraca percobaan");
      }
      return ((await res.json()) as { data: Report }).data;
    },
    enabled: !!effectiveClientId,
  });

  const { data: worksheet } = useQuery({
    queryKey: ["trial-balance-worksheet", effectiveClientId, period],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${effectiveClientId}/trial-balance?period=${period}&format=worksheet`);
      if (!res.ok) throw new Error("Gagal memuat lajur");
      return ((await res.json()) as { data: WorksheetSrv }).data;
    },
    enabled: !!effectiveClientId && mode === "lajur",
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${effectiveClientId}/periods/${period}/lock`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Gagal mengunci periode");
      }
      return ((await res.json()) as { data: { status: string; finalized: number } }).data;
    },
    onSuccess: (d) => {
      queryClient.setQueryData(reportKey, (old: Report | undefined) => (old ? { ...old, periodStatus: d.status as "OPEN" | "CLOSED" } : old));
      setLockError(null);
      router.refresh();
    },
    onError: (e) => setLockError((e as Error).message),
  });

  const exportUrl = (format: "csv" | "xlsx") =>
    effectiveClientId ? `/api/clients/${effectiveClientId}/trial-balance?period=${period}&format=${format}` : null;

  const handleLock = () => {
    if (!effectiveClientId || !report || report.periodStatus !== "OPEN") return;
    if (!window.confirm("Kunci periode ini? Jurnal APPROVED akan menjadi FINALIZED dan tidak bisa diedit langsung — perbaikan hanya lewat jurnal penyesuaian.")) return;
    lockMutation.mutate();
  };

  // ── Helper: render amt atau kosong ─────────────────────────────────────────
  const fmtOrEmpty = (v: number) => v > 0 ? formatCurrencyRp(v) : "";

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Klien
          <select
            value={effectiveClientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
          >
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Periode
          <input
            type="month" value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
          />
        </label>
        <a
          href={exportUrl("csv") ?? "#"} aria-disabled={!effectiveClientId}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            effectiveClientId ? "border-slate-200 text-slate-800 hover:border-accent/50 hover:text-accent" : "pointer-events-none opacity-40"}`}
        >↓ Ekspor CSV</a>
        <a
          href={exportUrl("xlsx") ?? "#"} aria-disabled={!effectiveClientId}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            effectiveClientId ? "border-slate-200 text-slate-800 hover:border-accent/50 hover:text-accent" : "pointer-events-none opacity-40"}`}
        >↓ Ekspor XLSX</a>
        <span className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
          📋 10-Kolom Big 4
        </span>
        <a
          href={effectiveClientId ? `/api/clients/${effectiveClientId}/trial-balance?period=${period}&format=worksheet-csv` : "#"}
          aria-disabled={!effectiveClientId}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            effectiveClientId ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20" : "pointer-events-none opacity-40"
          }`}
        >↓ Lajur CSV</a>
        {report?.periodStatus === "OPEN" && canLock && (
          <button type="button" onClick={handleLock} disabled={lockMutation.isPending}
            className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent transition hover:bg-accent/20 disabled:opacity-50">
            {lockMutation.isPending ? "Mengunci…" : "🔒 Kunci Periode"}
          </button>
        )}
        {lockError && <span className="text-xs text-rose-600">{lockError}</span>}
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-700">
          Menghitung neraca percobaan…
        </div>
      )}

      {!loading && !error && !report && (
        <EmptyState title="Belum ada data" description="Pilih klien dan periode untuk melihat neraca percobaan." />
      )}

      {!loading && !error && report && (
        <>
          {/* Ringkasan KPI */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([
              ["Total Debit", formatCurrencyRp(report.totalDebit)],
              ["Total Kredit", formatCurrencyRp(report.totalCredit)],
              ["Status", report.balanced ? "✓ Seimbang" : "Tidak seimbang"],
              ["Indikator", report.unusualCount === 0 ? "Semua wajar" : `${report.unusualCount} akun perlu cek`],
            ] as const).map(([label, val]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-700">{label}</p>
                <div className="mt-2">
                  {label === "Status" ? (
                    <Badge label={val} tone={report.balanced ? "positive" : "danger"} />
                  ) : label === "Indikator" ? (
                    <Badge label={val} tone={report.unusualCount === 0 ? "positive" : "danger"} />
                  ) : (
                    <p className="font-mono text-lg text-slate-900">{val}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── 10-KOLOM WORKKSHEET — ditampilkan di mode "lajur" ── */}
          {mode === "lajur" && worksheet && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-4 py-3">
                <div>
                  <h3 className="text-sm font-medium text-slate-900">
                    Neraca Lajur — {worksheet.clientName}
                  </h3>
                  <p className="text-xs text-slate-700">
                    {worksheet.period}
                    {worksheet.prevPeriodLabel ? ` · vs ${worksheet.prevPeriodLabel}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {worksheet.balanced && <Badge label="Seimbang" tone="positive" />}
                  {!worksheet.balanced && <Badge label="Tidak seimbang" tone="danger" />}
                  {report.periodStatus === "CLOSED" && <Badge label="🔒 Terkunci" tone="accent" />}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    💰 {new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(worksheet.labaBersih)}
                  </span>
                  <span className="text-xs text-slate-700">{worksheet.lines.length} akun</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                {/* 15 kolom: No | Kode | Nama | NS:D/K | Adj:D/K | AdjNS:D/K | LR:D/K | Ner:D/K | Prev | Var% */}
                <table className="w-full min-w-[1400px] text-left text-sm">
                  {/* Row 1: main groups */}
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] text-slate-700">
                      <th className="sticky left-0 z-20 bg-slate-50 px-2 py-1.5" rowSpan={2}>No</th>
                      <th className="sticky left-[40px] z-20 bg-slate-50 px-2 py-1.5" rowSpan={2}>Kode</th>
                      <th className="px-2 py-1.5" rowSpan={2}>Nama Akun</th>
                      <th className="px-2 py-1.5 text-center" colSpan={2}>Neraca Saldo</th>
                      <th className="px-2 py-1.5 text-center bg-slate-100/30" colSpan={2}>Penyesuaian</th>
                      <th className="px-2 py-1.5 text-center" colSpan={2}>NS Disesuaikan</th>
                      <th className="px-2 py-1.5 text-center" colSpan={2}>Laba Rugi</th>
                      <th className="px-2 py-1.5 text-center" colSpan={2}>Neraca</th>
                      <th className="px-2 py-1.5 text-center" colSpan={2}>vs Bln Lalu</th>
                    </tr>
                    {/* Row 2: D/K sub-headers */}
                    <tr className="border-b border-slate-200 text-[10px] text-slate-700">
                      <th className="px-2 py-1 text-right">D</th>
                      <th className="px-2 py-1 text-right">K</th>
                      <th className="px-2 py-1 text-right bg-slate-100/20">D</th>
                      <th className="px-2 py-1 text-right bg-slate-100/20">K</th>
                      <th className="px-2 py-1 text-right">D</th>
                      <th className="px-2 py-1 text-right">K</th>
                      <th className="px-2 py-1 text-right">D</th>
                      <th className="px-2 py-1 text-right">K</th>
                      <th className="px-2 py-1 text-right">D</th>
                      <th className="px-2 py-1 text-right">K</th>
                      <th className="px-2 py-1 text-right">Saldo</th>
                      <th className="px-2 py-1 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {worksheet.lines.map((l) => {
                      const isLaba = l.accountName.includes("LABA");
                      const rowBg = isLaba ? "bg-accent/10" : "";
                      return (
                        <tr
                          key={l.no}
                          className={`border-b border-slate-200/60 ${
                            isLaba ? "bg-accent/10 font-semibold text-slate-900" : "text-slate-700"
                          } ${l.isAdjusting ? "ring-1 ring-inset ring-amber-400/30" : ""}`}
                        >
                          <td className={`sticky left-0 z-10 px-2 py-1.5 text-slate-700 ${rowBg}`}>{l.no}</td>
                          <td className={`sticky left-[40px] z-10 px-2 py-1.5 font-mono text-[11px] text-slate-700 ${rowBg}`}>{l.accountCode}</td>
                          <td className="px-2 py-1.5">
                            {l.accountCode ? (
                              <a
                                href={`/dashboard/reports/ledger?clientId=${encodeURIComponent(report.clientId)}&accountCode=${encodeURIComponent(l.accountCode)}&period=${encodeURIComponent(worksheet.period)}`}
                                className="text-slate-700 hover:text-accent hover:underline transition"
                                title={`Buku Besar ${l.accountName}`}
                              >{l.accountName}</a>
                            ) : l.accountName}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">{fmtOrEmpty(l.nsDebit)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">{fmtOrEmpty(l.nsCredit)}</td>
                          <td className={`px-2 py-1.5 text-right font-mono text-[11px] bg-slate-100/20 ${l.isAdjusting ? "text-accent" : ""}`}>{fmtOrEmpty(l.adjDebit)}</td>
                          <td className={`px-2 py-1.5 text-right font-mono text-[11px] bg-slate-100/20 ${l.isAdjusting ? "text-accent" : ""}`}>{fmtOrEmpty(l.adjCredit)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">{fmtOrEmpty(l.adjNsDebit)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">{fmtOrEmpty(l.adjNsCredit)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">{fmtOrEmpty(l.lrDebit)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">{fmtOrEmpty(l.lrCredit)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">{fmtOrEmpty(l.neracaDebit)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px]">{fmtOrEmpty(l.neracaCredit)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px] text-slate-700">
                            {l.prevBalance !== null ? formatCurrencyRp(l.prevBalance) : ""}
                          </td>
                          <td className={`px-2 py-1.5 text-right font-mono text-[11px] ${
                            l.variancePct !== null
                              ? l.variancePct > 20 ? "text-emerald-600" : l.variancePct < -20 ? "text-rose-600" : "text-slate-700"
                              : ""
                          }`}>
                            {l.variancePct !== null ? `${l.variancePct >= 0 ? "↑" : "↓"}${Math.abs(l.variancePct).toFixed(0)}%` : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900 text-[11px]">
                      <td className="sticky left-0 z-10 bg-slate-50 px-2 py-2" colSpan={3}>TOTAL</td>
                      <td className="px-2 py-2 text-right font-mono">{formatCurrencyRp(worksheet.totals.nsDebit)}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatCurrencyRp(worksheet.totals.nsCredit)}</td>
                      <td className="px-2 py-2 text-right font-mono bg-slate-100/20">{formatCurrencyRp(worksheet.totals.adjDebit)}</td>
                      <td className="px-2 py-2 text-right font-mono bg-slate-100/20">{formatCurrencyRp(worksheet.totals.adjCredit)}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatCurrencyRp(worksheet.totals.adjNsDebit)}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatCurrencyRp(worksheet.totals.adjNsCredit)}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatCurrencyRp(worksheet.totals.lrDebit)}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatCurrencyRp(worksheet.totals.lrCredit)}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatCurrencyRp(worksheet.totals.neracaDebit)}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatCurrencyRp(worksheet.totals.neracaCredit)}</td>
                      <td className="px-2 py-2" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Mode Standar — tabel neraca percobaan ── */}
          {mode === "standar" && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-medium text-slate-900">
                  Neraca Percobaan — {report.clientName}
                </h3>
                <p className="text-xs text-slate-700">
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
                        className="text-accent/90 underline-offset-2 hover:underline"
                        title={`Buku besar ${r.accountName}`}
                      >
                        {r.accountCode}
                      </Link>
                    </TD>
                    <TD>{r.accountName}</TD>
                    <TD><Badge label={CLASS_LABELS[r.classification]} tone={CLASS_TONE[r.classification]} /></TD>
                    <TD className="text-right font-mono text-slate-700">{r.debit > 0 ? formatCurrencyRp(r.debit) : "—"}</TD>
                    <TD className="text-right font-mono text-slate-700">{r.credit > 0 ? formatCurrencyRp(r.credit) : "—"}</TD>
                    <TD className="text-right font-mono text-slate-900">{formatCurrencyRp(r.balance)}</TD>
                    <TD className="text-right font-mono text-slate-700">{r.prevBalance === null ? "—" : formatCurrencyRp(r.prevBalance)}</TD>
                    <TD>{r.unusualReason && <span className="text-xs text-red-600" title={r.unusualReason}>⚠ {r.unusualReason}</span>}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <span className="text-slate-700">Total</span>
              <span className="font-mono text-slate-800">
                {formatCurrencyRp(report.totalDebit)} = {formatCurrencyRp(report.totalCredit)}
              </span>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
}
