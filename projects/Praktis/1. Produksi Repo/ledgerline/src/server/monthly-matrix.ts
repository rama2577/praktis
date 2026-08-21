/**
 * Matrix 12 Bulan (Gap #3) — pola kertas kerja akuntan "LR/NRC (1-12)".
 * Laba Rugi: per bulan (transaksi bulan berjalan); Neraca: posisi akhir bulan
 * (akumulasi Januari–bulan berjalan) + kolom Total = akumulasi setahun.
 */
import { prisma } from "@/lib/db";
import { buildIncomeStatement, buildBalanceSheet } from "@/server/financial-statements";
import type { TrialBalanceRow } from "@/server/trial-balance";

export type MonthlyMatrix = {
  clientName: string;
  year: number;
  months: {
    period: string; // "2026-01"
    pendapatan: number;
    beban: number;
    laba: number; // laba bulan berjalan
    labaKumulatif: number; // YTD
    aset: number;
    liabilitas: number;
    ekuitas: number;
  }[];
  totals: { pendapatan: number; beban: number; laba: number; aset: number; liabilitas: number; ekuitas: number };
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const labelOf = (lines: { label: string; amount: number }[], label: string): number =>
  lines.find((l) => l.label === label)?.amount ?? 0;

export async function getMonthlyMatrix(clientId: string, clientName: string, year: number): Promise<MonthlyMatrix> {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const entries = await prisma.journalEntry.findMany({
    where: { clientId, status: { in: ["APPROVED", "FINALIZED"] }, entryDate: { gte: start, lt: end } },
    select: {
      entryDate: true,
      lines: { select: { accountCode: true, accountName: true, debit: true, credit: true } },
    },
  });

  // Agregasi per (bulan, akun).
  const byMonth = new Map<number, Map<string, { code: string; name: string; debit: number; credit: number }>>();
  for (const e of entries) {
    const month = e.entryDate.getUTCMonth() + 1;
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    const bucket = byMonth.get(month)!;
    for (const l of e.lines) {
      const cur = bucket.get(l.accountCode) ?? { code: l.accountCode, name: l.accountName, debit: 0, credit: 0 };
      cur.debit += Number(l.debit);
      cur.credit += Number(l.credit);
      if (l.accountName) cur.name = l.accountName;
      bucket.set(l.accountCode, cur);
    }
  }

function classifyCode(code: string): "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN" {
  const c = code.trim().charAt(0);
  if (c === "1") return "ASET";
  if (c === "2") return "LIABILITAS";
  if (c === "3") return "EKUITAS";
  if (c === "4" || c === "7") return "PENDAPATAN";
  return "BEBAN";
}

/** Klasifikasi → normal balance (untuk TrialBalanceRow). */
function normalBalanceOf(cls: string): "DEBIT" | "KREDIT" {
  return cls === "ASET" || cls === "BEBAN" ? "DEBIT" : "KREDIT";
}

const toRows = (bucket: Map<string, { code: string; name: string; debit: number; credit: number }>): TrialBalanceRow[] =>
    [...bucket.values()].map((t) => {
      const cls = classifyCode(t.code);
      const nb = normalBalanceOf(cls);
      const net = t.debit - t.credit;
      return {
        accountCode: t.code,
        accountName: t.name,
        classification: cls,
        debit: t.debit,
        credit: t.credit,
        net,
        balance: nb === "KREDIT" ? -net : net,
        normalBalance: nb,
        unusual: false,
        unusualReason: null,
        prevBalance: null,
      };
    });

  // Kumulatif Jan..m (untuk neraca posisi akhir bulan).
  const kumulatifRows = (m: number): TrialBalanceRow[] => {
    const agg = new Map<string, { code: string; name: string; debit: number; credit: number }>();
    for (let i = 1; i <= m; i++) {
      for (const [code, t] of byMonth.get(i) ?? []) {
        const cur = agg.get(code) ?? { code, name: t.name, debit: 0, credit: 0 };
        cur.debit += t.debit;
        cur.credit += t.credit;
        cur.name = t.name;
        agg.set(code, cur);
      }
    }
    return toRows(agg);
  };

  const months = [];
  let labaYtd = 0;
  for (const m of MONTHS) {
    const period = `${year}-${String(m).padStart(2, "0")}`;
    const income = buildIncomeStatement(toRows(byMonth.get(m) ?? new Map()), clientName, period);
    const laba = labelOf(income.lines, "LABA (RUGI) PERIODE BERJALAN");
    labaYtd += laba;
    const balance = buildBalanceSheet(kumulatifRows(m), clientName, period, labaYtd);
    months.push({
      period,
      pendapatan: labelOf(income.lines, "TOTAL PENDAPATAN"),
      beban: labelOf(income.lines, "TOTAL BEBAN"),
      laba,
      labaKumulatif: labaYtd,
      aset: labelOf(balance.lines, "TOTAL ASET"),
      liabilitas: labelOf(balance.lines, "TOTAL LIABILITAS"),
      ekuitas: labelOf(balance.lines, "TOTAL EKUITAS"),
    });
  }

  const totals = months.reduce(
    (acc, m) => ({
      pendapatan: acc.pendapatan + m.pendapatan,
      beban: acc.beban + m.beban,
      laba: acc.laba + m.laba,
      aset: m.aset, // posisi akhir tahun
      liabilitas: m.liabilitas,
      ekuitas: m.ekuitas,
    }),
    { pendapatan: 0, beban: 0, laba: 0, aset: 0, liabilitas: 0, ekuitas: 0 },
  );

  return { clientName, year, months, totals };
}
