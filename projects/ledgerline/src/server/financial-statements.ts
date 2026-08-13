/**
 * F6C — Laporan Keuangan akhir (format laporan Indonesia).
 * Pure: dari TrialBalanceRow → Laba Rugi, Neraca, Perubahan Ekuitas, Arus Kas
 * + export CSV. Sumber data: trial balance periode (APPROVED/FINALIZED).
 */

import type { TrialBalanceRow } from "./trial-balance";

// ── Tipe ─────────────────────────────────────────────────────────────────────

export type StatementLine = {
  label: string;
  amount: number;
  indent?: number; // 0 = header section, 1 = akun, 2 = sub
  bold?: boolean;
};

export type FinancialStatement = {
  title: string;
  clientName: string;
  period: string;
  lines: StatementLine[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function section(lines: StatementLine[], label: string, amount: number, bold = false) {
  lines.push({ label, amount, indent: 0, bold: true });
}

// ── Laba Rugi ────────────────────────────────────────────────────────────────

/** Laba rugi sederhana: pendapatan (4-*) − beban (5-*), saldo kredit-normal. */
export function buildIncomeStatement(rows: TrialBalanceRow[], clientName: string, period: string): FinancialStatement {
  const lines: StatementLine[] = [];
  const pendapatan = rows.filter((r) => r.classification === "PENDAPATAN");
  const beban = rows.filter((r) => r.classification === "BEBAN");

  section(lines, "PENDAPATAN", 0);
  for (const r of pendapatan) {
    if (r.balance === 0) continue;
    lines.push({ label: r.accountName, amount: r.balance, indent: 1 });
  }
  const totalPendapatan = pendapatan.reduce((s, r) => s + r.balance, 0);
  section(lines, "TOTAL PENDAPATAN", totalPendapatan);

  section(lines, "BEBAN", 0);
  for (const r of beban) {
    if (r.balance === 0) continue;
    lines.push({ label: r.accountName, amount: r.balance, indent: 1 });
  }
  const totalBeban = beban.reduce((s, r) => s + r.balance, 0);
  section(lines, "TOTAL BEBAN", totalBeban);

  const laba = totalPendapatan - totalBeban;
  lines.push({ label: "LABA (RUGI) PERIODE BERJALAN", amount: laba, indent: 0, bold: true });
  return { title: "LAPORAN LABA RUGI", clientName, period, lines };
}

// ── Neraca ───────────────────────────────────────────────────────────────────

/** Neraca: aset (1-*), liabilitas (2-*), ekuitas (3-*). Saldo normal per klasifikasi. */
export function buildBalanceSheet(rows: TrialBalanceRow[], clientName: string, period: string, priorLaba = 0): FinancialStatement {
  const lines: StatementLine[] = [];
  const aset = rows.filter((r) => r.classification === "ASET");
  const liabilitas = rows.filter((r) => r.classification === "LIABILITAS");
  const ekuitas = rows.filter((r) => r.classification === "EKUITAS");

  section(lines, "ASET", 0);
  for (const r of aset) {
    if (r.balance === 0) continue;
    lines.push({ label: r.accountName, amount: r.balance, indent: 1 });
  }
  const totalAset = aset.reduce((s, r) => s + r.balance, 0);
  section(lines, "TOTAL ASET", totalAset);

  section(lines, "LIABILITAS", 0);
  for (const r of liabilitas) {
    if (r.balance === 0) continue;
    lines.push({ label: r.accountName, amount: r.balance, indent: 1 });
  }
  const totalLiabilitas = liabilitas.reduce((s, r) => s + r.balance, 0);
  section(lines, "TOTAL LIABILITAS", totalLiabilitas);

  section(lines, "EKUITAS", 0);
  for (const r of ekuitas) {
    if (r.balance === 0) continue;
    lines.push({ label: r.accountName, amount: r.balance, indent: 1 });
  }
  if (priorLaba !== 0) {
    lines.push({ label: "Laba (rugi) periode berjalan", amount: priorLaba, indent: 1 });
  }
  const totalEkuitas = ekuitas.reduce((s, r) => s + r.balance, 0) + priorLaba;
  section(lines, "TOTAL EKUITAS", totalEkuitas);

  const total = totalLiabilitas + totalEkuitas;
  lines.push({ label: "TOTAL LIABILITAS & EKUITAS", amount: total, indent: 0, bold: true });
  return { title: "NERACA", clientName, period, lines };
}

// ── Perubahan Ekuitas ────────────────────────────────────────────────────────

/** Apakah akun = Laba Berjalan (tidak masuk saldo awal, diisi baris laba). */
export function isLabaBerjalan(r: { accountCode: string; accountName: string }): boolean {
  const code = r.accountCode.trim();
  const name = r.accountName.toLowerCase();
  if (name.includes("laba berjalan") || name.includes("laba tahun berjalan")) return true;
  // Template base: 3300/3301; ASC: 3301
  return /^330[01]/.test(code) || code.includes("-3301");
}

/** Aktivitas ekuitas periode (setoran modal & prive) — dihitung dari jurnal. */
export type EquityActivity = { setoranModal: number; prive: number };

/**
 * Laporan Perubahan Ekuitas (Gap #5, v2):
 * - Saldo awal = akun ekuitas tanpa Laba Berjalan (hindari dobel hitung).
 * - Baris setoran modal & prive/dividen dari aktivitas periode.
 * - Saldo akhir = awal + setoran + laba − prive.
 */
export function buildEquityStatement(
  rows: TrialBalanceRow[],
  clientName: string,
  period: string,
  laba: number,
  activity: EquityActivity = { setoranModal: 0, prive: 0 },
): FinancialStatement {
  const lines: StatementLine[] = [];
  const ekuitas = rows.filter((r) => r.classification === "EKUITAS");
  const ekuitasTanpaLabaBerjalan = ekuitas.filter((r) => !isLabaBerjalan(r));
  const saldoAwal = ekuitasTanpaLabaBerjalan.reduce((s, r) => s + r.balance, 0);
  const saldoAkhir = saldoAwal + activity.setoranModal + laba - activity.prive;

  section(lines, "SALDO AWAL EKUITAS", saldoAwal);
  for (const r of ekuitasTanpaLabaBerjalan) {
    if (r.balance === 0) continue;
    lines.push({ label: `  ${r.accountName}`, amount: r.balance, indent: 1 });
  }
  if (activity.setoranModal !== 0) {
    section(lines, "SETORAN MODAL PERIODE BERJALAN", activity.setoranModal);
  }
  if (activity.prive !== 0) {
    section(lines, "PRIVE / DIVIDEN", -activity.prive);
  }
  section(lines, "LABA (RUGI) PERIODE BERJALAN", laba);
  section(lines, "SALDO AKHIR EKUITAS", saldoAkhir, true);

  // Validasi silang: saldo akhir harus sama dengan total akun ekuitas di neraca.
  const totalEkuitasNeraca = ekuitas.reduce((s, r) => s + r.balance, 0);
  if (Math.abs(saldoAkhir - totalEkuitasNeraca) > 1) {
    lines.push({
      label: "CATATAN: selisih dengan neraca (periksa akun Laba Berjalan)",
      amount: Math.round((saldoAkhir - totalEkuitasNeraca) * 100) / 100,
      indent: 0,
    });
  }
  return { title: "LAPORAN PERUBAHAN EKUITAS", clientName, period, lines };
}

// ── Arus Kas (metode langsung, dari akun kas) ────────────────────────────────

export function buildCashFlowStatement(rows: TrialBalanceRow[], clientName: string, period: string): FinancialStatement {
  const lines: StatementLine[] = [];
  const kas = rows.filter((r) => r.accountCode.startsWith("1-1000") || r.accountCode.startsWith("1-1100"));
  const masuk = kas.reduce((s, r) => s + r.debit, 0);
  const keluar = kas.reduce((s, r) => s + r.credit, 0);

  section(lines, "ARUS KAS DARI AKTIVITAS OPERASI (metode langsung)", 0);
  lines.push({ label: "Penerimaan kas", amount: masuk, indent: 1 });
  lines.push({ label: "Pengeluaran kas", amount: -keluar, indent: 1 });
  const bersihOperasi = masuk - keluar;
  section(lines, "ARUS KAS BERSIH OPERASI", bersihOperasi);

  const bersih = bersihOperasi;
  lines.push({ label: "KENAIKAN (PENURUNAN) KAS", amount: bersih, indent: 0, bold: true });
  const saldoAkhir = kas.reduce((s, r) => s + r.balance, 0);
  lines.push({ label: "SALDO KAS AKHIR PERIODE", amount: saldoAkhir, indent: 0, bold: true });
  return { title: "LAPORAN ARUS KAS", clientName, period, lines };
}

// ── CSV ──────────────────────────────────────────────────────────────────────

function esc(v: string | number) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export function statementCsv(stmt: FinancialStatement): string {
  const lines: string[] = [esc(`${stmt.title} — ${stmt.clientName} — ${stmt.period}`)];
  for (const l of stmt.lines) {
    if (l.label.includes("TOTAL") || l.bold) {
      lines.push([esc(l.label), l.amount.toFixed(2)].join(","));
    } else {
      lines.push([esc("  ".repeat(l.indent ?? 0) + l.label), l.amount.toFixed(2)].join(","));
    }
  }
  return lines.join("\n");
}
