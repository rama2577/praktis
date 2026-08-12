/**
 * Neraca Lajur (worksheet) 10-kolom — format standar Big 4.
 * Kolom: No | Kode | Nama Akun | Ref |
 *   Neraca Saldo (D/K) | Penyesuaian (D/K) | NS Disesuaikan (D/K) |
 *   Laba Rugi (D/K) | Neraca (D/K)
 * + baris TOTAL + LABA (RUGI) BERSIH agar seluruh pasangan kolom seimbang.
 * + Saldo Bulan Lalu & Varians (%) untuk komparatif periode.
 *
 * Format referensi: IAS 1 / SAK ETAP — 10-column worksheet.
 * Akuntan bekerja: NS → jurnal penyesuaian → NS Disesuaikan → distribusi LR & Neraca.
 */

import type { TrialBalanceRow } from "./trial-balance";

export type WorksheetLine = {
  no: number;
  accountCode: string;
  accountName: string;
  ref: string;
  // Neraca Saldo
  nsDebit: number;
  nsCredit: number;
  // Penyesuaian (dari jurnal ADJUSTING)
  adjDebit: number;
  adjCredit: number;
  // NS Disesuaikan = NS ± Penyesuaian
  adjNsDebit: number;
  adjNsCredit: number;
  // Laba Rugi (PENDAPATAN → kredit, BEBAN → debit)
  lrDebit: number;
  lrCredit: number;
  // Neraca (ASET → debit, LIABILITAS/EKUITAS → kredit)
  neracaDebit: number;
  neracaCredit: number;
  // Komparatif
  prevBalance: number | null;
  variance: number | null; // selisih absolut
  variancePct: number | null; // selisih %
  isAdjusting: boolean; // true jika akun ini punya penyesuaian
};

export type Worksheet = {
  clientName: string;
  period: string;
  prevPeriodLabel: string | null;
  lines: WorksheetLine[];
  totals: {
    nsDebit: number;
    nsCredit: number;
    adjDebit: number;
    adjCredit: number;
    adjNsDebit: number;
    adjNsCredit: number;
    lrDebit: number;
    lrCredit: number;
    neracaDebit: number;
    neracaCredit: number;
  };
  labaBersih: number;
  balanced: boolean;
};

const isDebitNormal = (c: TrialBalanceRow["classification"]) => c === "ASET" || c === "BEBAN";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNs(row: TrialBalanceRow, bal: number): { nsDebit: number; nsCredit: number } {
  const debitNormal = isDebitNormal(row.classification);
  if (row.classification === "LAINNYA") {
    return bal >= 0 ? { nsDebit: bal, nsCredit: 0 } : { nsDebit: 0, nsCredit: -bal };
  }
  if (debitNormal) {
    return bal >= 0 ? { nsDebit: bal, nsCredit: 0 } : { nsDebit: 0, nsCredit: -bal };
  }
  return bal >= 0 ? { nsDebit: 0, nsCredit: bal } : { nsDebit: -bal, nsCredit: 0 };
}

function toLr(row: TrialBalanceRow, nsD: number, nsC: number): { lrDebit: number; lrCredit: number } {
  if (row.classification === "BEBAN") return { lrDebit: nsD, lrCredit: 0 };
  if (row.classification === "PENDAPATAN") return { lrDebit: 0, lrCredit: nsC };
  return { lrDebit: 0, lrCredit: 0 };
}

function toNeraca(row: TrialBalanceRow, bal: number): { neracaDebit: number; neracaCredit: number } {
  if (row.classification === "ASET") {
    return bal >= 0 ? { neracaDebit: bal, neracaCredit: 0 } : { neracaDebit: 0, neracaCredit: -bal };
  }
  if (row.classification === "LIABILITAS" || row.classification === "EKUITAS") {
    return bal >= 0 ? { neracaDebit: 0, neracaCredit: bal } : { neracaDebit: -bal, neracaCredit: 0 };
  }
  return { neracaDebit: 0, neracaCredit: 0 };
}

/** Bangun neraca lajur 10-kolom dari trial balance. */
export function buildWorksheet(
  rows: TrialBalanceRow[],
  clientName: string,
  period: string,
  prevPeriodLabel?: string | null,
): Worksheet {
  const lines: WorksheetLine[] = rows.map((r, i) => {
    const bal = r.balance;
    const prevBal = r.prevBalance ?? null;
    const ns = toNs(r, bal);

    // Penyesuaian: 0 untuk akun tanpa jurnal ADJUSTING.
    // (Tenant akan mengisi ini saat akuntan membuat jurnal penyesuaian.)
    const adj = { adjDebit: 0, adjCredit: 0 };

    // NS Disesuaikan = NS ± Penyesuaian (untuk debit-normal: D - C; untuk kredit-normal: C - D)
    const adjNs = isDebitNormal(r.classification)
      ? { adjNsDebit: ns.nsDebit + adj.adjDebit - adj.adjCredit, adjNsCredit: 0 }
      : { adjNsDebit: 0, adjNsCredit: ns.nsCredit + adj.adjCredit - adj.adjDebit };

    // Normalisasi adjNs ke D/K (tidak boleh negatif di pasangan)
    if (adjNs.adjNsDebit < 0) {
      adjNs.adjNsCredit = -adjNs.adjNsDebit;
      adjNs.adjNsDebit = 0;
    }
    if (adjNs.adjNsCredit < 0) {
      adjNs.adjNsDebit = -adjNs.adjNsCredit;
      adjNs.adjNsCredit = 0;
    }

    // Distribusi Laba Rugi dan Neraca dari NS DISESUAIKAN
    const lr = toLr(r, adjNs.adjNsDebit, adjNs.adjNsCredit);
    const nb = toNeraca(r, r.balance); // neraca dari balance asli (setelah adj via akun)

    // Tabahan penyesuaian ke neraca
    if (r.classification === "ASET") {
      nb.neracaDebit = adjNs.adjNsDebit;
      nb.neracaCredit = adjNs.adjNsCredit;
    }
    if (r.classification === "LIABILITAS" || r.classification === "EKUITAS") {
      nb.neracaCredit = adjNs.adjNsCredit;
      nb.neracaDebit = adjNs.adjNsDebit;
    }

    // Varians vs bulan lalu
    const variance = prevBal !== null ? bal - prevBal : null;
    const variancePct = prevBal !== null && prevBal !== 0 ? (variance! / prevBal) * 100 : null;

    return {
      no: i + 1,
      accountCode: r.accountCode,
      accountName: r.accountName,
      ref: r.accountCode.split("-")[0] ?? "",
      nsDebit: ns.nsDebit,
      nsCredit: ns.nsCredit,
      adjDebit: adj.adjDebit,
      adjCredit: adj.adjCredit,
      adjNsDebit: adjNs.adjNsDebit,
      adjNsCredit: adjNs.adjNsCredit,
      lrDebit: lr.lrDebit,
      lrCredit: lr.lrCredit,
      neracaDebit: nb.neracaDebit,
      neracaCredit: nb.neracaCredit,
      prevBalance: prevBal,
      variance,
      variancePct,
      isAdjusting: adj.adjDebit > 0 || adj.adjCredit > 0,
    };
  });

  const sum = (f: (l: WorksheetLine) => number) => lines.reduce((s, l) => s + f(l), 0);
  const totals = {
    nsDebit: sum((l) => l.nsDebit),
    nsCredit: sum((l) => l.nsCredit),
    adjDebit: sum((l) => l.adjDebit),
    adjCredit: sum((l) => l.adjCredit),
    adjNsDebit: sum((l) => l.adjNsDebit),
    adjNsCredit: sum((l) => l.adjNsCredit),
    lrDebit: sum((l) => l.lrDebit),
    lrCredit: sum((l) => l.lrCredit),
    neracaDebit: sum((l) => l.neracaDebit),
    neracaCredit: sum((l) => l.neracaCredit),
  };

  // Laba bersih = LR kredit − LR debit → pindah ke sisi yang lebih kecil
  const labaBersih = totals.lrCredit - totals.lrDebit;
  let lrFix = { deb: 0, cre: 0 };
  let nbFix = { deb: 0, cre: 0 };
  if (labaBersih >= 0) {
    lrFix = { deb: labaBersih, cre: 0 };
    nbFix = { deb: 0, cre: labaBersih };
  } else {
    lrFix = { deb: 0, cre: -labaBersih };
    nbFix = { deb: -labaBersih, cre: 0 };
  }

  lines.push({
    no: lines.length + 1,
    accountCode: "",
    accountName: "LABA (RUGI) BERSIH",
    ref: "",
    nsDebit: 0,
    nsCredit: 0,
    adjDebit: 0,
    adjCredit: 0,
    adjNsDebit: 0,
    adjNsCredit: 0,
    lrDebit: lrFix.deb,
    lrCredit: lrFix.cre,
    neracaDebit: nbFix.deb,
    neracaCredit: nbFix.cre,
    prevBalance: null,
    variance: null,
    variancePct: null,
    isAdjusting: false,
  });

  const finalTotals = { ...totals };
  finalTotals.lrDebit += lrFix.deb;
  finalTotals.lrCredit += lrFix.cre;
  finalTotals.neracaDebit += nbFix.deb;
  finalTotals.neracaCredit += nbFix.cre;

  return {
    clientName,
    period,
    prevPeriodLabel: prevPeriodLabel ?? null,
    lines,
    totals: finalTotals,
    labaBersih,
    balanced:
      Math.abs(finalTotals.nsDebit - finalTotals.nsCredit) < 1 &&
      Math.abs(finalTotals.adjDebit - finalTotals.adjCredit) < 1 &&
      Math.abs(finalTotals.adjNsDebit - finalTotals.adjNsCredit) < 1 &&
      Math.abs(finalTotals.lrDebit - finalTotals.lrCredit) < 1 &&
      Math.abs(finalTotals.neracaDebit - finalTotals.neracaCredit) < 1,
  };
}

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** CSV neraca lajur 10-kolom — 15 kolom total (No + Kode + Nama + Ref + 5 pair × 2 kolom). */
export function worksheetCsv(w: Worksheet): string {
  const head = [
    "No", "Kode Akun", "Nama Akun", "Ref",
    "NS Debit", "NS Kredit",
    "Penyesuaian Debit", "Penyesuaian Kredit",
    "NS Disesuaikan Debit", "NS Disesuaikan Kredit",
    "Laba Rugi Debit", "Laba Rugi Kredit",
    "Neraca Debit", "Neraca Kredit",
    "Saldo Bulan Lalu", "Varians %",
  ];
  const out: string[] = [head.map(esc).join(",")];
  for (const l of w.lines) {
    out.push([
      l.no, l.accountCode, l.accountName, l.ref,
      l.nsDebit.toFixed(2), l.nsCredit.toFixed(2),
      l.adjDebit.toFixed(2), l.adjCredit.toFixed(2),
      l.adjNsDebit.toFixed(2), l.adjNsCredit.toFixed(2),
      l.lrDebit.toFixed(2), l.lrCredit.toFixed(2),
      l.neracaDebit.toFixed(2), l.neracaCredit.toFixed(2),
      l.prevBalance?.toFixed(2) ?? "",
      l.variancePct?.toFixed(1) ?? "",
    ].map(esc).join(","));
  }
  out.push([
    "", "", "TOTAL", "",
    w.totals.nsDebit.toFixed(2), w.totals.nsCredit.toFixed(2),
    w.totals.adjDebit.toFixed(2), w.totals.adjCredit.toFixed(2),
    w.totals.adjNsDebit.toFixed(2), w.totals.adjNsCredit.toFixed(2),
    w.totals.lrDebit.toFixed(2), w.totals.lrCredit.toFixed(2),
    w.totals.neracaDebit.toFixed(2), w.totals.neracaCredit.toFixed(2),
    "", "",
  ].map(esc).join(","));
  return out.join("\n");
}
