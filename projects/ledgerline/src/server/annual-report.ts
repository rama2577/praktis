/**
 * Penyampaian Laporan Keuangan — format annual report (adaptasi gaya
 * penyampaian laporan tahunan Unilever): halaman judul, ikhtisar keuangan,
 * analisis & pembahasan manajemen, laporan keuangan + CALK, pernyataan tanggung jawab.
 * Referensi: skills/keuangan-akuntansi-indonesia/references/08-adaptasi-annual-report-unilever.md
 */

import type { TrialBalanceRow } from "./trial-balance";
import { buildAnalysis } from "./financial-analysis";
import { buildCalk, type Calk } from "./calk";
import { buildTaxAnalysis, type TaxAnalysis } from "./tax-analysis";
import { buildWorksheet } from "./worksheet";
import type { TaxLine } from "./tax";
import { buildIncomeStatement, buildBalanceSheet, buildEquityStatement, buildCashFlowStatement } from "./financial-statements";

export type AnnualReport = {
  clientName: string;
  period: string;
  legalName: string;
  industry: string;
  preparedAt: string;
  highlights: { label: string; value: string; delta?: string }[];
  analysis: ReturnType<typeof buildAnalysis>;
  calk: Calk;
  taxAnalysis: TaxAnalysis;
  statements: {
    labaRugi: ReturnType<typeof buildIncomeStatement>;
    neraca: ReturnType<typeof buildBalanceSheet>;
    ekuitas: ReturnType<typeof buildEquityStatement>;
    arusKas: ReturnType<typeof buildCashFlowStatement>;
  };
  worksheet: ReturnType<typeof buildWorksheet>;
};

type Input = {
  clientName: string;
  period: string;
  rows: TrialBalanceRow[];
  taxLines: TaxLine[];
  profile?: {
    legalName?: string | null;
    industry?: string | null;
    address?: string | null;
    taxId?: string | null;
    description?: string | null;
  } | null;
  depreciationMethod?: string | null;
  assetCount?: number | null;
};

const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
const rp = (n: number) => `Rp${fmt(n)}`;

export function buildAnnualReport(input: Input): AnnualReport {
  const { clientName, period, rows, taxLines, profile, depreciationMethod, assetCount } = input;
  const analysis = buildAnalysis(rows, clientName, period);
  const calk = buildCalk({ clientName, period, rows, profile, depreciationMethod, assetCount });
  const taxAnalysis = buildTaxAnalysis(clientName, period, taxLines, rows);
  const worksheet = buildWorksheet(rows, clientName, period);

  const labaRugi = buildIncomeStatement(rows, clientName, period);
  const laba = labaRugi.lines.find((l) => l.label.includes("LABA (RUGI)"))?.amount ?? 0;
  const neraca = buildBalanceSheet(rows, clientName, period, laba);
  const ekuitas = buildEquityStatement(rows, clientName, period, laba);
  const arusKas = buildCashFlowStatement(rows, clientName, period);

  const pendapatan = analysis.charts.pendapatanVsBeban.pendapatan;
  const aset = neraca.lines.find((l) => l.label === "TOTAL ASET")?.amount ?? 0;
  const liabilitas = neraca.lines.find((l) => l.label === "TOTAL LIABILITAS")?.amount ?? 0;

  const highlights = [
    { label: "Pendapatan", value: rp(pendapatan) },
    { label: "Laba (Rugi) Bersih", value: rp(laba) },
    { label: "Total Aset", value: rp(aset) },
    { label: "Total Liabilitas", value: rp(liabilitas) },
    {
      label: "Tax Ratio",
      value: taxAnalysis.taxRatio.value === null ? "N/A" : `${(taxAnalysis.taxRatio.value * 100).toFixed(1)}%`,
    },
  ];

  return {
    clientName,
    period,
    legalName: profile?.legalName || clientName,
    industry: profile?.industry || "usaha jasa/dagang",
    preparedAt: new Date().toISOString().slice(0, 10),
    highlights,
    analysis,
    calk,
    taxAnalysis,
    statements: { labaRugi, neraca, ekuitas, arusKas },
    worksheet,
  };
}

/** Export annual report sebagai Markdown (siap PDF via browser/Word). */
export function annualReportMarkdown(r: AnnualReport): string {
  const out: string[] = [];
  out.push(`# ${r.legalName.toUpperCase()}`);
  out.push(`## LAPORAN KEUANGAN — PERIODE ${r.period}`);
  out.push(`Disusun oleh manajemen · ${r.preparedAt}`);
  out.push("");
  out.push(`### 1. Ikhtisar Keuangan`);
  for (const h of r.highlights) out.push(`- **${h.label}:** ${h.value}`);
  out.push("");
  out.push(`### 2. Analisis & Pembahasan Manajemen`);
  for (const n of r.analysis.narrative) out.push(`- ${n}`);
  out.push("");
  for (const ratio of r.analysis.ratios) {
    out.push(
      `- **${ratio.label}:** ${ratio.value === null ? "N/A" : ratio.value.toFixed(2)} (${ratio.verdict}) — ${ratio.formula}`,
    );
  }
  out.push("");
  out.push(`### 3. Analisa Pajak & Tax Ratio`);
  for (const n of r.taxAnalysis.narrative) out.push(`- ${n}`);
  out.push("");
  for (const b of r.taxAnalysis.breakdown) out.push(`- **${b.label}:** ${rp(b.value)} — ${b.note}`);
  out.push("");
  const st = (title: string, s: ReturnType<typeof buildIncomeStatement>) => {
    out.push(`### 4. ${title}`);
    for (const l of s.lines) out.push(`${l.indent ? "  ".repeat(l.indent) : ""}${l.label}: ${rp(l.amount)}`);
    out.push("");
  };
  st("LAPORAN LABA RUGI", r.statements.labaRugi);
  st("NERACA", r.statements.neraca);
  st("LAPORAN PERUBAHAN EKUITAS", r.statements.ekuitas);
  st("LAPORAN ARUS KAS", r.statements.arusKas);
  out.push(`### 5. Catatan atas Laporan Keuangan`);
  for (const s of r.calk.sections) {
    out.push(`**${s.number}. ${s.title}**`);
    for (const p of s.paragraphs) out.push(p);
    for (const it of s.items ?? []) out.push(`- ${it.label}: ${it.value}`);
    out.push("");
  }
  out.push(`### 6. Pernyataan Tanggung Jawab`);
  out.push("Laporan keuangan di atas telah disusun sesuai SAK ETAP dan merupakan tanggung jawab manajemen entitas.");
  return out.join("\n");
}
