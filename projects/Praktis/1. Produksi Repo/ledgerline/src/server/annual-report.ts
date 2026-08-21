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
import PDFDocument from "pdfkit";

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
  const worksheet = buildWorksheet(rows, clientName, period, null);

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

/** Export penyampaian sebagai CSV (baris label–nilai dari seluruh bagian). */
export function annualReportCsv(r: AnnualReport): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const out: string[] = [esc("BAGIAN"), esc("POS"), esc("NILAI")];
  out.push([esc("IKHTISAR"), esc(r.legalName), esc(`Laporan Keuangan — Periode ${r.period}`)].join(","));
  for (const h of r.highlights) out.push([esc("IKHTISAR"), esc(h.label), esc(h.value)].join(","));
  for (const n of r.analysis.narrative) out.push([esc("ANALISA"), esc(n), ""].join(","));
  for (const b of r.taxAnalysis.breakdown) out.push([esc("PAJAK"), esc(b.label), esc(rp(b.value))].join(","));
  const pushStmt = (section: string, s: ReturnType<typeof buildIncomeStatement>) => {
    for (const l of s.lines) out.push([esc(section), esc(l.label), esc(rp(l.amount))].join(","));
  };
  pushStmt("LAPORAN LABA RUGI", r.statements.labaRugi);
  pushStmt("NERACA", r.statements.neraca);
  pushStmt("PERUBAHAN EKUITAS", r.statements.ekuitas);
  pushStmt("ARUS KAS", r.statements.arusKas);
  for (const s of r.calk.sections) {
    for (const p of s.paragraphs) out.push([esc("CALK"), esc(`${s.number}. ${s.title}`), esc(p)].join(","));
  }
  return out.join("\n");
}

/** Export annual report sebagai PDF (pdfkit, A4). */
export async function annualReportPdf(r: AnnualReport): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.on("data", (c: Buffer) => chunks.push(c));

  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const title = (t: string) => {
    doc.moveDown(0.8);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#b45309").text(t);
    doc.fillColor("#000");
  };
  const line = (label: string, value: string, indent = 0, bold = false) => {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(9)
      .text(label, { indent, continued: true });
    doc.text(value, { align: "right" });
  };

  // Halaman judul
  doc.fontSize(16).font("Helvetica-Bold").text(r.legalName.toUpperCase(), { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(12).font("Helvetica").text(`LAPORAN KEUANGAN — PERIODE ${r.period}`, { align: "center" });
  doc.fontSize(9).fillColor("#666").text(`Disusun oleh manajemen · ${r.preparedAt} · Bidang usaha: ${r.industry}`, { align: "center" });
  doc.fillColor("#000");

  title("1. Ikhtisar Keuangan");
  for (const h of r.highlights) line(h.label, h.value);

  title("2. Analisis & Pembahasan Manajemen");
  doc.fontSize(8.5).font("Helvetica");
  for (const n of r.analysis.narrative) doc.text("• " + n, { indent: 12 });
  doc.moveDown(0.3);
  for (const ratio of r.analysis.ratios) {
    line(
      `${ratio.label} — ${ratio.value === null ? "N/A" : ratio.value.toFixed(2)} (${ratio.verdict})`,
      ratio.formula,
      12,
    );
  }

  title("3. Analisa Pajak & Tax Ratio");
  doc.fontSize(8.5).font("Helvetica");
  for (const n of r.taxAnalysis.narrative) doc.text("• " + n, { indent: 12 });
  for (const b of r.taxAnalysis.breakdown) line(b.label, rp(b.value), 12);

  const stmt = (t: string, s: ReturnType<typeof buildIncomeStatement>) => {
    title(t);
    doc.fontSize(8.5);
    for (const l of s.lines) {
      line(`${l.indent ? "  ".repeat(l.indent) : ""}${l.label}`, rp(l.amount), 0, !!l.bold);
    }
  };
  stmt("4. LAPORAN LABA RUGI", r.statements.labaRugi);
  stmt("NERACA", r.statements.neraca);
  stmt("LAPORAN PERUBAHAN EKUITAS", r.statements.ekuitas);
  stmt("LAPORAN ARUS KAS", r.statements.arusKas);

  title("5. Catatan atas Laporan Keuangan");
  doc.fontSize(8.5).font("Helvetica");
  for (const s of r.calk.sections) {
    doc.font("Helvetica-Bold").text(`${s.number}. ${s.title}`);
    doc.font("Helvetica");
    for (const p of s.paragraphs) doc.text(p, { indent: 10 });
    for (const it of s.items ?? []) doc.text(`• ${it.label}: ${it.value}`, { indent: 10 });
    doc.moveDown(0.2);
  }

  title("6. Pernyataan Tanggung Jawab");
  doc.fontSize(8.5).font("Helvetica").text(
    "Laporan keuangan di atas telah disusun sesuai SAK ETAP dan merupakan tanggung jawab manajemen entitas.",
    { indent: 10 },
  );

  doc.end();
  return done;
}
