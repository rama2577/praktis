import ExcelJS from "exceljs";
import type { FiscalPeriodStatus, JournalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  journalIsBalanced,
  validateLinesAgainstCoa,
  ManualJournalError,
  type ManualLineInput,
} from "@/server/manual-journal";

// ── Tipe ────────────────────────────────────────────────────────────────────

export type LedgerEntry = {
  journalId: string;
  entryDate: Date;
  description: string | null;
  journalType: string;
  status: JournalStatus;
  reference: string; // mis. "AI-xxx", "MANUAL-xxx"
  debit: number;
  credit: number;
  balance: number; // saldo berjalan (kumulatif per urutan tanggal)
};

export type LedgerReport = {
  clientId: string;
  clientName: string;
  accountCode: string;
  accountName: string;
  period: string;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  status: FiscalPeriodStatus;
};

export type ReclassLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  psakRef?: string | null;
  notes?: string | null;
};

// ── Buku besar ──────────────────────────────────────────────────────────────

const TB_STATUSES: JournalStatus[] = ["APPROVED", "FINALIZED"];

/** Cek status periode tutup buku klien (OPEN/CLOSED). */
export async function getFiscalPeriodStatus(
  clientId: string,
  period: string,
): Promise<FiscalPeriodStatus> {
  const fp = await prisma.fiscalPeriod.findUnique({
    where: { clientId_period: { clientId, period } },
    select: { status: true },
  });
  return fp?.status ?? "OPEN";
}

/**
 * Buku besar satu akun untuk satu periode: seluruh jurnal APPROVED/FINALIZED
 * yang memuat akun tsb, dengan saldo berjalan (kumulatif per tanggal).
 */
export async function getLedger(
  clientId: string,
  clientName: string,
  accountCode: string,
  period: string,
): Promise<LedgerReport> {
  const [entries, periodStatus] = await Promise.all([
    prisma.journalEntry.findMany({
      where: {
        clientId,
        status: { in: TB_STATUSES },
        lines: { some: { accountCode } },
      },
      select: {
        id: true,
        entryDate: true,
        description: true,
        journalType: true,
        status: true,
        createdAt: true,
        lines: {
          where: { accountCode },
          select: { accountName: true, debit: true, credit: true, notes: true },
        },
      },
      orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
    }),
    getFiscalPeriodStatus(clientId, period),
  ]);

  const accountName = entries.find((e) => e.lines.length > 0)?.lines[0]?.accountName ?? accountCode;

  let running = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  const rows: LedgerEntry[] = entries.map((e) => {
    const line = e.lines[0];
    const debit = Number(line?.debit ?? 0);
    const credit = Number(line?.credit ?? 0);
    running += debit - credit;
    totalDebit += debit;
    totalCredit += credit;
    return {
      journalId: e.id,
      entryDate: e.entryDate,
      description: e.description,
      journalType: e.journalType,
      status: e.status,
      reference: e.journalType === "AI" ? `AI-${e.id.slice(-6)}` : `MNL-${e.id.slice(-6)}`,
      debit,
      credit,
      balance: Math.round(running * 100) / 100,
    };
  });

  return {
    clientId,
    clientName,
    accountCode,
    accountName,
    period,
    entries: rows,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    closingBalance: Math.round(running * 100) / 100,
    status: periodStatus,
  };
}

// ── Kunci periode (partner) ─────────────────────────────────────────────────

/**
 * Kunci periode: FiscalPeriod → CLOSED + semua jurnal APPROVED periode tsb
 * → FINALIZED. Setelah terkunci, edit langsung dilarang (lihat reclassJournal).
 */
export async function lockPeriod(params: {
  firmId: string;
  clientId: string;
  period: string;
  lockedById: string;
}): Promise<{ status: FiscalPeriodStatus; finalized: number }> {
  const { firmId, clientId, period, lockedById } = params;

  const existing = await prisma.fiscalPeriod.findUnique({
    where: { clientId_period: { clientId, period } },
  });
  if (existing?.status === "CLOSED") {
    throw new ManualJournalError("Periode sudah terkunci.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const fp = await tx.fiscalPeriod.upsert({
      where: { clientId_period: { clientId, period } },
      create: { firmId, clientId, period, status: "CLOSED", lockedById, lockedAt: new Date() },
      update: { status: "CLOSED", lockedById, lockedAt: new Date() },
    });

    // Finalisasi jurnal APPROVED pada periode tsb
    const finalized = await tx.journalEntry.updateMany({
      where: {
        clientId,
        status: "APPROVED",
        entryDate: { gte: periodStart(period), lt: periodEnd(period) },
      },
      data: { status: "FINALIZED" },
    });

    return { status: fp.status, finalized: finalized.count };
  });

  return result;
}

/** Kunci periode: hanya partner/admin (guard di route). */

// ── Reclass (edit jurnal APPROVED sebelum lock) ─────────────────────────────

/**
 * Perbaiki/reclass jurnal APPROVED — hanya selama periode belum terkunci dan
 * jurnal belum FINALIZED. Validasi: minimal 2 baris, debit = kredit, akun COA
 * klien (jika mapping ada), dan tidak menyentuh jurnal AI yang masih draft.
 */
export async function reclassJournal(params: {
  firmId: string;
  journalId: string;
  lines: ReclassLine[];
  userId: string;
}): Promise<{ id: string; status: JournalStatus }> {
  const { firmId, journalId, lines, userId } = params;

  const journal = await prisma.journalEntry.findFirst({
    where: { id: journalId, firmId },
    include: { client: { select: { id: true } }, lines: true },
  });
  if (!journal) throw new ManualJournalError("Jurnal tidak ditemukan.");
  if (journal.status !== "APPROVED") {
    throw new ManualJournalError("Hanya jurnal APPROVED yang bisa di-reclass.");
  }

  const period = periodOf(journal.entryDate);
  const status = await getFiscalPeriodStatus(journal.clientId, period);
  if (status === "CLOSED") {
    throw new ManualJournalError("Periode sudah terkunci — perbaiki lewat jurnal penyesuaian.");
  }

  const balance = journalIsBalanced(lines as ManualLineInput[]);
  if (!balance.ok) throw new ManualJournalError(balance.error ?? "Jurnal tidak seimbang.");

  const profile = await prisma.clientProfile.findUnique({
    where: { clientId: journal.clientId },
    select: { coaMapping: true },
  });
  const coaCheck = validateLinesAgainstCoa(lines as ManualLineInput[], profile?.coaMapping);
  if (!coaCheck.ok) {
    throw new ManualJournalError(coaCheck.error ?? "Akun tidak ada di COA klien.");
  }

  const before = journal.lines.map((l) => ({
    accountCode: l.accountCode,
    accountName: l.accountName,
    debit: Number(l.debit),
    credit: Number(l.credit),
  }));

  await prisma.$transaction(async (tx) => {
    await tx.journalLine.deleteMany({ where: { journalEntryId: journal.id } });
    await tx.journalLine.createMany({
      data: lines.map((l) => ({
        journalEntryId: journal.id,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.debit,
        credit: l.credit,
        psakRef: l.psakRef ?? null,
        notes: l.notes ?? null,
      })),
    });
    await tx.activityLog.create({
      data: {
        firmId,
        userId,
        journalEntryId: journal.id,
        action: "JOURNAL_EDITED",
        detail: {
          scope: "reclass",
          period,
          before,
          after: lines.map((l) => ({
            accountCode: l.accountCode,
            accountName: l.accountName,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
    });
  });

  return { id: journal.id, status: journal.status };
}

// ── Helpers periode ─────────────────────────────────────────────────────────

function periodStart(period: string): Date {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

function periodEnd(period: string): Date {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1));
}

export function periodOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ── Export buku besar (CSV / XLSX) ───────────────────────────────────────────

const escCsv = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function ledgerCsv(r: LedgerReport): string {
  const head = ["Tanggal", "Referensi", "Uraian", "Jenis", "Status", "Debit", "Kredit", "Saldo Berjalan"];
  const out: string[] = [head.map(escCsv).join(",")];
  for (const e of r.entries) {
    out.push(
      [
        e.entryDate.toISOString().slice(0, 10),
        e.reference,
        e.description ?? "",
        e.journalType,
        e.status,
        e.debit.toFixed(2),
        e.credit.toFixed(2),
        e.balance.toFixed(2),
      ]
        .map(escCsv)
        .join(","),
    );
  }
  out.push(
    [escCsv("TOTAL"), "", "", "", "", escCsv(r.totalDebit.toFixed(2)), escCsv(r.totalCredit.toFixed(2)), escCsv(r.closingBalance.toFixed(2))].join(","),
  );
  return out.join("\n");
}

export async function ledgerXlsx(r: LedgerReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Buku Besar");
  ws.addRow(["BUKU BESAR", r.clientName, `Periode ${r.period}`, `Akun ${r.accountCode} — ${r.accountName}`]);
  ws.addRow([]);
  ws.addRow(["Tanggal", "Referensi", "Uraian", "Jenis", "Status", "Debit", "Kredit", "Saldo Berjalan"]);
  for (const e of r.entries) {
    ws.addRow([e.entryDate.toISOString().slice(0, 10), e.reference, e.description ?? "", e.journalType, e.status, e.debit, e.credit, e.balance]);
  }
  ws.addRow(["TOTAL", "", "", "", "", r.totalDebit, r.totalCredit, r.closingBalance]);
  ws.columns = [{ width: 12 }, { width: 16 }, { width: 44 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 16 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}