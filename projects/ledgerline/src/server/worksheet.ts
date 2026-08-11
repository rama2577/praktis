/**
 * Neraca Lajur (worksheet) — format klasik spreadsheet akuntan.
 * Kolom: No | Nama Akun | Ref | Neraca Saldo (D/K) | Laba Rugi (D/K) | Neraca (D/K)
 * + baris TOTAL dan LABA (RUGI) BERSIH agar ketiga pasang kolom seimbang.
 */

import type { TrialBalanceRow } from "./trial-balance";

export type WorksheetLine = {
  no: number;
  accountCode: string;
  accountName: string;
  ref: string;
  nsDebit: number;
  nsCredit: number;
  lrDebit: number;
  lrCredit: number;
  neracaDebit: number;
  neracaCredit: number;
};

export type Worksheet = {
  clientName: string;
  period: string;
  lines: WorksheetLine[];
  totals: {
    nsDebit: number;
    nsCredit: number;
    lrDebit: number;
    lrCredit: number;
    neracaDebit: number;
    neracaCredit: number;
  };
  labaBersih: number; // positif = laba, negatif = rugi
  balanced: boolean;
};

const isDebitNormal = (c: TrialBalanceRow["classification"]) => c === "ASET" || c === "BEBAN";

/** Bangun neraca lajur dari trial balance. Semua angka sudah normal-balance (balance). */
export function buildWorksheet(rows: TrialBalanceRow[], clientName: string, period: string): Worksheet {
  const lines: WorksheetLine[] = rows.map((r, i) => {
    const debitNormal = isDebitNormal(r.classification);
    const bal = r.balance;

    let nsDebit = 0;
    let nsCredit = 0;
    if (r.classification === "LAINNYA") {
      if (bal >= 0) nsDebit = bal;
      else nsCredit = -bal;
    } else if (debitNormal) {
      nsDebit = bal >= 0 ? bal : 0;
      nsCredit = bal < 0 ? -bal : 0;
    } else {
      nsCredit = bal >= 0 ? bal : 0;
      nsDebit = bal < 0 ? -bal : 0;
    }

    let lrDebit = 0;
    let lrCredit = 0;
    if (r.classification === "BEBAN") lrDebit = nsDebit;
    if (r.classification === "PENDAPATAN") lrCredit = nsCredit;

    let neracaDebit = 0;
    let neracaCredit = 0;
    if (r.classification === "ASET") {
      if (bal >= 0) neracaDebit = bal;
      else neracaCredit = -bal; // akun kontra aset (mis. akumulasi penyusutan)
    }
    if (r.classification === "LIABILITAS" || r.classification === "EKUITAS") {
      if (bal >= 0) neracaCredit = bal;
      else neracaDebit = -bal;
    }

    return {
      no: i + 1,
      accountCode: r.accountCode,
      accountName: r.accountName,
      ref: r.accountCode.split("-")[0] ?? "",
      nsDebit,
      nsCredit,
      lrDebit,
      lrCredit,
      neracaDebit,
      neracaCredit,
    };
  });

  const sum = (f: (l: WorksheetLine) => number) => lines.reduce((s, l) => s + f(l), 0);
  const totals = {
    nsDebit: sum((l) => l.nsDebit),
    nsCredit: sum((l) => l.nsCredit),
    lrDebit: sum((l) => l.lrDebit),
    lrCredit: sum((l) => l.lrCredit),
    neracaDebit: sum((l) => l.neracaDebit),
    neracaCredit: sum((l) => l.neracaCredit),
  };

  // Laba bersih = LR kredit − LR debit; dipindah ke sisi yang lebih kecil
  // agar LR seimbang, dan ke sisi lawan di kolom Neraca (laba menambah ekuitas).
  const labaBersih = totals.lrCredit - totals.lrDebit;
  let lrDebitFix = 0;
  let lrCreditFix = 0;
  let neracaDebitFix = 0;
  let neracaCreditFix = 0;
  if (labaBersih >= 0) {
    lrDebitFix = labaBersih;
    neracaCreditFix = labaBersih;
  } else {
    lrCreditFix = -labaBersih;
    neracaDebitFix = -labaBersih;
  }

  lines.push({
    no: lines.length + 1,
    accountCode: "",
    accountName: "LABA (RUGI) BERSIH",
    ref: "",
    nsDebit: 0,
    nsCredit: 0,
    lrDebit: lrDebitFix,
    lrCredit: lrCreditFix,
    neracaDebit: neracaDebitFix,
    neracaCredit: neracaCreditFix,
  });

  const finalTotals = {
    nsDebit: totals.nsDebit,
    nsCredit: totals.nsCredit,
    lrDebit: totals.lrDebit + lrDebitFix,
    lrCredit: totals.lrCredit + lrCreditFix,
    neracaDebit: totals.neracaDebit + neracaDebitFix,
    neracaCredit: totals.neracaCredit + neracaCreditFix,
  };

  return {
    clientName,
    period,
    lines,
    totals: finalTotals,
    labaBersih,
    balanced:
      Math.abs(finalTotals.nsDebit - finalTotals.nsCredit) < 1 &&
      Math.abs(finalTotals.lrDebit - finalTotals.lrCredit) < 1 &&
      Math.abs(finalTotals.neracaDebit - finalTotals.neracaCredit) < 1,
  };
}

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** CSV neraca lajur — 1 baris per akun, 10 kolom ala spreadsheet. */
export function worksheetCsv(w: Worksheet): string {
  const head = [
    "No",
    "Kode Akun",
    "Nama Akun",
    "Ref",
    "Neraca Saldo Debit",
    "Neraca Saldo Kredit",
    "Laba Rugi Debit",
    "Laba Rugi Kredit",
    "Neraca Debit",
    "Neraca Kredit",
  ];
  const out: string[] = [head.map(esc).join(",")];
  for (const l of w.lines) {
    out.push(
      [
        l.no,
        l.accountCode,
        l.accountName,
        l.ref,
        l.nsDebit.toFixed(2),
        l.nsCredit.toFixed(2),
        l.lrDebit.toFixed(2),
        l.lrCredit.toFixed(2),
        l.neracaDebit.toFixed(2),
        l.neracaCredit.toFixed(2),
      ]
        .map(esc)
        .join(","),
    );
  }
  out.push(
    [
      "",
      "",
      "TOTAL",
      "",
      w.totals.nsDebit.toFixed(2),
      w.totals.nsCredit.toFixed(2),
      w.totals.lrDebit.toFixed(2),
      w.totals.lrCredit.toFixed(2),
      w.totals.neracaDebit.toFixed(2),
      w.totals.neracaCredit.toFixed(2),
    ]
      .map(esc)
      .join(","),
  );
  return out.join("\n");
}
