/**
 * Analisa Pajak — tax ratio & rincian PPN/PPh dari baris pajak + trial balance.
 * Rule-based (tanpa LLM eksternal), konsisten dengan keputusan fallback.
 */

import type { TrialBalanceRow } from "./trial-balance";
import type { TaxLine } from "./tax";
import { inferTaxCode } from "./tax";

export type TaxAnalysis = {
  clientName: string;
  period: string;
  taxRatio: { value: number | null; formula: string; note: string };
  ppn: { pk: number; pm: number; kurangBayar: number; note: string };
  pph: {
    pph21: number;
    pph23: number;
    pph25_29: number;
    totalPPh: number;
    effectiveTaxRate: number | null;
    note: string;
  };
  breakdown: { label: string; value: number; note: string }[];
  narrative: string[];
};

const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
const rp = (n: number) => `Rp${fmt(n)}`;

/** Bangun analisa pajak dari baris pajak (tax lines) + TB (pendapatan/laba). */
export function buildTaxAnalysis(
  clientName: string,
  period: string,
  taxLines: TaxLine[],
  rows: TrialBalanceRow[],
): TaxAnalysis {
  const pendapatan = rows.filter((r) => r.classification === "PENDAPATAN").reduce((s, r) => s + r.balance, 0);
  const beban = rows.filter((r) => r.classification === "BEBAN").reduce((s, r) => s + r.balance, 0);
  const laba = pendapatan - beban;

  // taxCode efektif: override DB ?? inferensi (getTaxLines bisa mengembalikan null)
  const codeOf = (l: TaxLine) => l.taxCode ?? inferTaxCode(l.accountCode, l.notes);
  const pk = taxLines.filter((l) => codeOf(l)?.startsWith("PPN-OUT")).reduce((s, l) => s + l.credit, 0);
  const pm = taxLines.filter((l) => codeOf(l)?.startsWith("PPN-IN")).reduce((s, l) => s + l.debit, 0);
  const pph21 = taxLines.filter((l) => codeOf(l) === "PPH21").reduce((s, l) => s + l.credit, 0);
  const pph23 = taxLines.filter((l) => codeOf(l)?.startsWith("PPH23")).reduce((s, l) => s + l.credit, 0);
  const pph25_29 = taxLines.filter((l) => codeOf(l) === "PPH25" || codeOf(l) === "PPH29").reduce((s, l) => s + l.credit, 0);
  const totalPPh = pph21 + pph23 + pph25_29;

  const kurangBayar = pk - pm; // PK sudah dalam rupiah PPN (baris 2-2000)
  const taxRatio = pendapatan === 0 ? null : (totalPPh + Math.max(kurangBayar, 0)) / pendapatan;
  const effectiveTaxRate = laba === 0 ? null : totalPPh / laba;

  const breakdown = [
    { label: "PPN Keluaran (PK)", value: pk, note: `Dari ${taxLines.filter((l) => l.taxCode?.startsWith("PPN-OUT")).length} faktur pajak` },
    { label: "PPN Masukan (PM)", value: pm, note: "Kredit pajak yang dapat dikurangkan" },
    { label: "PPN Kurang Bayar", value: Math.max(kurangBayar, 0), note: kurangBayar < 0 ? "Terdapat kelebihan bayar PPN" : "Setoran PPN masa" },
    { label: "PPh Pasal 21", value: pph21, note: "PPh karyawan" },
    { label: "PPh Pasal 23", value: pph23, note: "PPh atas jasa" },
    { label: "PPh Pasal 25/29", value: pph25_29, note: "Angsuran/penghitungan akhir PPh badan" },
    { label: "Total PPh", value: totalPPh, note: "Seluruh PPh yang dipotong/disetor" },
  ];

  const narrative: string[] = [];
  narrative.push(
    `Tax ratio periode ${period}: ${taxRatio === null ? "N/A" : (taxRatio * 100).toFixed(1)}% dari pendapatan ${rp(pendapatan)}. Tax ratio mengukur beban pajak (PPN kurang bayar + total PPh) terhadap pendapatan — indikator kepatuhan & beban pajak entitas.`,
  );
  narrative.push(
    kurangBayar >= 0
      ? `PPN: PK ${rp(pk)} dengan PM ${rp(pm)} → kurang bayar ${rp(kurangBayar)}.`
      : `PPN: PK ${rp(pk)} dengan PM ${rp(pm)} → kelebihan bayar ${rp(-kurangBayar)} dapat dikompensasi.`,
  );
  narrative.push(
    `PPh: total ${rp(totalPPh)} (PPh 21 ${rp(pph21)}, PPh 23 ${rp(pph23)}, PPh 25/29 ${rp(pph25_29)}). Effective tax rate terhadap laba ${laba === 0 ? "N/A" : `${(effectiveTaxRate! * 100).toFixed(1)}%`} vs tarif PPh badan 22% — selisih wajar karena PPh 21/23 adalah pemotongan pihak ketiga, bukan beban final badan.`,
  );
  narrative.push(
    taxRatio !== null && taxRatio > 0.05
      ? `Tax ratio ${(taxRatio * 100).toFixed(1)}% tergolong signifikan; pastikan kredit pajak (PM & PPh 23) seluruhnya dimanfaatkan.`
      : `Tax ratio ${taxRatio === null ? "N/A" : (taxRatio * 100).toFixed(1)}% tergolong ringan; periksa kelengkapan kewajiban PPh 21/23/25 dan PPN masa.`,
  );

  return {
    clientName,
    period,
    taxRatio: {
      value: taxRatio,
      formula: "(Total PPh + PPN Kurang Bayar) ÷ Pendapatan",
      note: `Total PPh ${rp(totalPPh)} + PPN KB ${rp(Math.max(kurangBayar, 0))} ÷ pendapatan ${rp(pendapatan)}`,
    },
    ppn: { pk, pm, kurangBayar, note: "PK/PM dari baris pajak (DPP di kolom taxBase)" },
    pph: { pph21, pph23, pph25_29, totalPPh, effectiveTaxRate, note: "Tarif PPh badan 22%" },
    breakdown,
    narrative,
  };
}
