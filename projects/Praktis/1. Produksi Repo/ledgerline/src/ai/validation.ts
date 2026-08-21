import type { RuleLine } from "@/ai/rule-engine";

/**
 * Validasi baris draft jurnal.
 * - Total debit == total credit (balance = 0) — fundamental akuntansi
 * - Setiap baris punya accountCode & psakRef (traceability)
 * - Jumlah > 0; tidak boleh debit & kredit sekaligus
 */
export function validateDraftLines(
  lines: RuleLine[],
): { ok: true; balance: number } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (lines.length === 0) {
    return { ok: false, errors: ["Tidak ada baris jurnal."] };
  }

  for (const [i, line] of lines.entries()) {
    if (!line.accountCode) errors.push(`Baris ${i + 1}: accountCode kosong.`);
    if (!line.accountName) errors.push(`Baris ${i + 1}: accountName kosong.`);
    if (!line.psakRef) errors.push(`Baris ${i + 1}: psakRef kosong (traceability wajib).`);
    if (line.debit < 0 || line.credit < 0) errors.push(`Baris ${i + 1}: jumlah negatif.`);
    if (line.debit > 0 && line.credit > 0) errors.push(`Baris ${i + 1}: debit dan kredit terisi bersamaan.`);
    if (line.debit === 0 && line.credit === 0) errors.push(`Baris ${i + 1}: jumlah nol.`);
  }

  const debitTotal = round2(lines.reduce((s, l) => s + l.debit, 0));
  const creditTotal = round2(lines.reduce((s, l) => s + l.credit, 0));
  const balance = round2(debitTotal - creditTotal);

  if (Math.abs(balance) > 0.01) {
    errors.push(`Jurnal tidak balance: debit ${debitTotal} vs kredit ${creditTotal}.`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, balance };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
