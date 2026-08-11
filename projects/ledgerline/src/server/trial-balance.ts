import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { getFiscalPeriodStatus } from "@/server/ledger";

// ── Tipe ────────────────────────────────────────────────────────────────────

export type AccountClassification =
  | "ASET"
  | "LIABILITAS"
  | "EKUITAS"
  | "PENDAPATAN"
  | "BEBAN"
  | "LAINNYA";

export type NormalBalance = "DEBIT" | "KREDIT";

export type TrialBalanceRow = {
  accountCode: string;
  accountName: string;
  classification: AccountClassification;
  debit: number; // total debit periode berjalan
  credit: number; // total kredit periode berjalan
  net: number; // debit - kredit
  balance: number; // saldo sesuai normal (debit-normal: net; kredit-normal: -net)
  normalBalance: NormalBalance | null;
  unusual: boolean;
  unusualReason: string | null;
  prevBalance: number | null; // saldo bulan lalu (komparatif)
};

export type TrialBalanceReport = {
  clientId: string;
  clientName: string;
  period: string; // "2026-08"
  prevPeriod: string | null;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  unusualCount: number;
  periodStatus: "OPEN" | "CLOSED"; // F2.5E: status tutup buku
};

type LineLike = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

export type EntryLike = {
  entryDate: Date;
  lines: LineLike[];
};

// ── Pure helpers ─────────────────────────────────────────────────────────────

const EPS = 0.005;

/** Parse "2026-08" → rentang tanggal [awal bulan, awal bulan berikutnya). */
export function parsePeriod(period: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

/** Periode sebelumnya: "2026-08" → "2026-07"; "2026-01" → "2025-12". */
export function prevPeriodOf(period: string): string | null {
  const p = parsePeriod(period);
  if (!p) return null;
  const d = new Date(Date.UTC(p.start.getUTCFullYear(), p.start.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Klasifikasi akun dari kode (konvensi COA Indonesia):
 * 1xxx aset · 2xxx liabilitas · 3xxx ekuitas · 4xxx pendapatan · 5xxx beban.
 * Kode lain (mis. 6xxx, 9xxx, tanpa angka) → LAINNYA.
 */
export function classifyAccount(code: string): AccountClassification {
  const first = code.trim().charAt(0);
  switch (first) {
    case "1":
      return "ASET";
    case "2":
      return "LIABILITAS";
    case "3":
      return "EKUITAS";
    case "4":
      return "PENDAPATAN";
    case "5":
    case "6":
      return "BEBAN";
    default:
      return "LAINNYA";
  }
}

export const NORMAL_BALANCE: Record<AccountClassification, NormalBalance | null> = {
  ASET: "DEBIT",
  LIABILITAS: "KREDIT",
  EKUITAS: "KREDIT",
  PENDAPATAN: "KREDIT",
  BEBAN: "DEBIT",
  LAINNYA: null,
};

export const CLASSIFICATION_LABELS: Record<AccountClassification, string> = {
  ASET: "Aset",
  LIABILITAS: "Liabilitas",
  EKUITAS: "Ekuitas",
  PENDAPATAN: "Pendapatan",
  BEBAN: "Beban",
  LAINNYA: "Lainnya",
};

function unusualReasonFor(
  classification: AccountClassification,
  accountName: string,
  net: number,
): string | null {
  if (Math.abs(net) < EPS) return null;
  if (classification === "ASET" || classification === "BEBAN") {
    if (net < -EPS) {
      const isReceivable = accountName.toLowerCase().includes("piutang");
      return isReceivable
        ? "Piutang negatif — kemungkinan kelebihan pembayaran atau kredit memo belum dibukukan"
        : "Saldo kredit pada akun aset/beban — cek klasifikasi atau jurnal terbalik";
    }
    return null;
  }
  if (classification === "LIABILITAS" || classification === "EKUITAS" || classification === "PENDAPATAN") {
    if (net > EPS) {
      return "Saldo debit pada akun liabilitas/ekuitas/pendapatan — cek klasifikasi atau jurnal terbalik";
    }
    return null;
  }
  return null;
}

/** Agregasi entri → trial balance per akun (murni, tanpa IO). */
export function buildTrialBalance(
  entries: EntryLike[],
  period: string,
  prevEntries: EntryLike[] = [],
  prevPeriod: string | null = null,
): TrialBalanceReport {
  const totals = new Map<
    string,
    { code: string; name: string; debit: number; credit: number }
  >();
  const prevTotals = new Map<string, number>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const key = line.accountCode;
      const cur = totals.get(key) ?? { code: key, name: line.accountName, debit: 0, credit: 0 };
      cur.debit += line.debit;
      cur.credit += line.credit;
      if (line.accountName) cur.name = line.accountName;
      totals.set(key, cur);
    }
  }
  for (const entry of prevEntries) {
    for (const line of entry.lines) {
      prevTotals.set(
        line.accountCode,
        (prevTotals.get(line.accountCode) ?? 0) + line.debit - line.credit,
      );
    }
  }

  const rows: TrialBalanceRow[] = [...totals.values()]
    .map((t) => {
      const classification = classifyAccount(t.code);
      const normalBalance = NORMAL_BALANCE[classification];
      const net = t.debit - t.credit;
      const balance = normalBalance === "KREDIT" ? -net : net;
      const prevNet = prevTotals.get(t.code) ?? 0;
      const prevBalance = normalBalance === "KREDIT" ? -prevNet : prevNet;
      const unusualReason = unusualReasonFor(classification, t.name, net);
      return {
        accountCode: t.code,
        accountName: t.name,
        classification,
        debit: round2(t.debit),
        credit: round2(t.credit),
        net: round2(net),
        balance: round2(balance),
        normalBalance,
        unusual: unusualReason !== null,
        unusualReason,
        prevBalance: prevEntries.length > 0 ? round2(prevBalance) : null,
      };
    })
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode, undefined, { numeric: true }));

  const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0));

  return {
    clientId: "",
    clientName: "",
    period,
    prevPeriod,
    rows,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < EPS,
    unusualCount: rows.filter((r) => r.unusual).length,
    periodStatus: "OPEN",
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Query (tenant-scoped di route; di sini hanya per klien) ─────────────────

type FetchRow = {
  entryDate: Date;
  lines: LineLike[];
};

async function fetchEntries(clientId: string, start: Date, end: Date): Promise<FetchRow[]> {
  const rows = await prisma.journalEntry.findMany({
    where: {
      clientId,
      status: { in: ["APPROVED", "FINALIZED"] },
      entryDate: { gte: start, lt: end },
    },
    select: {
      entryDate: true,
      lines: {
        select: { accountCode: true, accountName: true, debit: true, credit: true },
      },
    },
  });
  return rows.map((r) => ({
    entryDate: r.entryDate,
    lines: r.lines.map((l) => ({
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: Number(l.debit),
      credit: Number(l.credit),
    })),
  }));
}

/** Ambil trial balance klien untuk periode (format "YYYY-MM") + komparatif bulan lalu. */
export async function getTrialBalance(
  clientId: string,
  clientName: string,
  period: string,
): Promise<TrialBalanceReport | null> {
  const range = parsePeriod(period);
  if (!range) return null;
  const prevPeriod = prevPeriodOf(period);
  const prevRange = prevPeriod ? parsePeriod(prevPeriod) : null;

  const [entries, prevEntries, periodStatus] = await Promise.all([
    fetchEntries(clientId, range.start, range.end),
    prevRange ? fetchEntries(clientId, prevRange.start, prevRange.end) : Promise.resolve([]),
    getFiscalPeriodStatus(clientId, period),
  ]);

  const report = buildTrialBalance(entries, period, prevEntries, prevPeriod);
  report.clientId = clientId;
  report.clientName = clientName;
  report.periodStatus = periodStatus;
  return report;
}

// ── Ekspor ───────────────────────────────────────────────────────────────────

/** CSV dengan separator koma, angka titik (format umum spreadsheet ID). */
export function trialBalanceCsv(report: TrialBalanceReport): string {
  const header = [
    "Kode Akun",
    "Nama Akun",
    "Klasifikasi",
    "Debit",
    "Kredit",
    "Saldo",
    "Bulan Lalu",
    "Indikator",
  ];
  const lines = report.rows.map((r) =>
    [
      r.accountCode,
      `"${r.accountName.replace(/"/g, '""')}"`,
      CLASSIFICATION_LABELS[r.classification],
      r.debit.toFixed(2),
      r.credit.toFixed(2),
      r.balance.toFixed(2),
      r.prevBalance === null ? "" : r.prevBalance.toFixed(2),
      r.unusualReason ? `"${r.unusualReason.replace(/"/g, '""')}"` : "",
    ].join(","),
  );
  return [header.join(","), ...lines, "", `Total Debit,${report.totalDebit.toFixed(2)}`, `Total Kredit,${report.totalCredit.toFixed(2)}`].join("\n");
}

/** XLSX (buffer siap dikirim). */
export function trialBalanceXlsx(report: TrialBalanceReport): Buffer {
  const data = report.rows.map((r) => ({
    "Kode Akun": r.accountCode,
    "Nama Akun": r.accountName,
    Klasifikasi: CLASSIFICATION_LABELS[r.classification],
    Debit: r.debit,
    Kredit: r.credit,
    Saldo: r.balance,
    "Bulan Lalu": r.prevBalance ?? "",
    Indikator: r.unusualReason ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Neraca Percobaan");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
