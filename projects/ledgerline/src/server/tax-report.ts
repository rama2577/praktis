/**
 * F5B — Wrapper DB: ambil baris pajak dari jurnal APPROVED/FINALIZED periode,
 * gabungkan kode pajak (override tersimpan ?? inferensi), hitung summary,
 * dan koreksi fiskal aset dari jadwal penyusutan (F5A).
 */

import { prisma } from "@/lib/db";
import { getTrialBalance } from "@/server/trial-balance";
import { classifyTaxLines, type TaxLine } from "@/server/tax";

const TAX_ACCOUNT_PREFIXES = ["2-2000", "2-2100", "2-2200", "2-2300", "2-2400", "2-2500", "1-1400"];

/** Baris jurnal periode yang menyentuh akun pajak (kredit = terutang; PPN masukan di debit). */
export async function getTaxLines(clientId: string, period: string): Promise<TaxLine[]> {
  const p = /^(\d{4})-(\d{2})$/.exec(period);
  if (!p) throw new Error("Format periode: YYYY-MM.");
  const year = Number(p[1]);
  const month = Number(p[2]);

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const journals = await prisma.journalEntry.findMany({
    where: {
      clientId,
      status: { in: ["APPROVED", "FINALIZED"] },
      entryDate: { gte: start, lt: end },
    },
    select: {
      id: true,
      description: true,
      entryDate: true,
      lines: {
        where: {
          OR: TAX_ACCOUNT_PREFIXES.map((prefix) => ({ accountCode: { startsWith: prefix } })),
        },
        select: {
          id: true,
          accountCode: true,
          accountName: true,
          debit: true,
          credit: true,
          notes: true,
          taxCode: true,
          taxBase: true,
        },
      },
    },
    orderBy: { entryDate: "asc" },
  });

  return journals.flatMap((j) =>
    j.lines.map((l) => ({
      lineId: l.id,
      journalId: j.id,
      journalDescription: j.description,
      entryDate: j.entryDate.toISOString(),
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: Number(l.debit),
      credit: Number(l.credit),
      notes: l.notes,
      taxCode: l.taxCode,
      taxBase: l.taxBase === null ? null : Number(l.taxBase),
    })),
  );
}

/** Ringkasan pajak klien untuk periode. */
export async function getTaxSummary(clientId: string, clientName: string, period: string) {
  const lines = await getTaxLines(clientId, period);
  const summary = classifyTaxLines(lines, period);
  return { ...summary, clientName, lineCount: lines.length };
}

/** Koreksi fiskal aset periode: jumlah (penyusutan komersial − fiskal) dari jadwal F5A. */
export async function getAssetTaxCorrection(clientId: string, period: string): Promise<number> {
  const rows = await prisma.depreciationSchedule.findMany({
    where: { asset: { clientId }, period },
    select: { commercialAmount: true, fiscalAmount: true },
  });
  const correction = rows.reduce((s, r) => s + (Number(r.commercialAmount) - Number(r.fiscalAmount)), 0);
  return Math.round(correction * 100) / 100;
}

/** Data lengkap SPT 1771: trial balance + koreksi fiskal aset. */
export async function getSpt1771Data(clientId: string, clientName: string, period: string) {
  const [tb, assetCorrection] = await Promise.all([
    getTrialBalance(clientId, clientName, period),
    getAssetTaxCorrection(clientId, period),
  ]);
  if (!tb) throw new Error("Trial balance tidak tersedia untuk periode ini.");
  return {
    rows: tb.rows,
    assetCorrection,
  };
}

/** Override kode pajak baris jurnal (review tax specialist). */
export async function setLineTaxCode(
  lineId: string,
  firmId: string,
  clientId: string,
  taxCode: string | null,
  taxBase?: number | null,
): Promise<{ id: string; taxCode: string | null }> {
  const line = await prisma.journalLine.findFirst({
    where: {
      id: lineId,
      journalEntry: { firmId, clientId, status: { in: ["APPROVED", "FINALIZED"] } },
    },
  });
  if (!line) throw new Error("Baris jurnal tidak ditemukan atau tidak dapat diubah.");
  if (taxCode !== null) {
    const { TAX_CODE_CATALOG } = await import("@/server/tax");
    if (!TAX_CODE_CATALOG[taxCode]) throw new Error("Kode pajak tidak valid.");
  }
  const updated = await prisma.journalLine.update({
    where: { id: lineId },
    data: {
      taxCode,
      taxBase: taxBase === null || taxBase === undefined ? undefined : taxBase,
    },
    select: { id: true, taxCode: true },
  });
  return updated;
}
