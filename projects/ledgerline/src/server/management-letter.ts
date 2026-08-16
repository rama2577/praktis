/**
 * Management Letter Generator — format standar Big 4.
 * Menghasilkan surat manajemen dari data yang ada di sistem:
 * exceptions, SLA breachess, unusual items, tax findings, ratio analysis.
 *
 * Struktur (ISO 20700 for management consulting):
 * 1. Executive Summary
 * 2. Scope & Approach
 * 3. Observations & Recommendations
 * 4. Summary of Findings (by severity)
 * 5. Management Response Tracker
 * 6. Closing & Next Steps
 */

import type { TrialBalanceRow } from "./trial-balance";
import type { Analysis } from "./financial-analysis";
import type { TaxAnalysis } from "./tax-analysis";
import type { QualityMetrics } from "./metrics";

export type Severity = "HIGH" | "MEDIUM" | "LOW" | "OBSERVATION";

export type Finding = {
  id: string;
  area: "ACCOUNTING" | "INTERNAL_CONTROL" | "TAX" | "PROCESS" | "IT" | "GENERAL";
  title: string;
  severity: Severity;
  description: string;
  impact: string;
  recommendation: string;
  managementResponse?: string;
  source: "system" | "manual";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
};

export type ManagementLetter = {
  clientName: string;
  period: string;
  preparedFor: string;
  preparedBy: string;
  date: string;
  reference: string;
  executiveSummary: string;
  scope: string;
  findings: Finding[];
  summary: {
    high: number;
    medium: number;
    low: number;
    observation: number;
    total: number;
    resolved: number;
  };
  narrative: string[];
};

// ── Builders ─────────────────────────────────────────────────────────────────

type BuildInput = {
  clientName: string;
  period: string;
  preparedFor?: string;
  preparedBy?: string;
  reference?: string;
  rows: TrialBalanceRow[];
  analysis: Analysis;
  taxAnalysis?: TaxAnalysis | null;
  qualityMetrics?: QualityMetrics | null;
  exceptions?: { accountName: string; reason: string; status: string }[];
  slaBreaches?: { stage: string; count: number; rate: number }[];
  priorFindings?: Finding[];
};

export function buildManagementLetter(input: BuildInput): ManagementLetter {
  const {
    clientName, period, preparedFor, preparedBy, reference,
    rows, analysis, taxAnalysis, qualityMetrics, exceptions, slaBreaches, priorFindings,
  } = input;

  const findings: Finding[] = [];
  let idx = 0;

  // ── 1. Financial findings (from unusual trial balances) ──
  const unusualRows = rows.filter((r) => r.unusual);
  for (const r of unusualRows.slice(0, 5)) {
    findings.push({
      id: `F-${String(++idx).padStart(3, "0")}`,
      area: "ACCOUNTING",
      title: `Saldo tidak wajar: ${r.accountName}`,
      severity: r.balance !== 0 && Math.abs(r.balance) > 100_000_000 ? "HIGH" : "MEDIUM",
      description: `Akun ${r.accountCode} — ${r.accountName} memiliki saldo ${r.balance.toLocaleString("id-ID")} yang terindikasi tidak wajar${r.unusualReason ? ` (${r.unusualReason})` : ""}. Nilai ini berada di luar pola normal untuk klasifikasi ${r.classification}.`,
      impact: "Risiko salah saji material dalam laporan keuangan. Dapat mempengaruhi opini audit dan kepercayaan pemangku kepentingan.",
      recommendation: `Lakukan pemeriksaan rinci atas transaksi di akun ${r.accountName}. Verifikasi ke dokumen sumber dan lakukan jurnal penyesuaian jika diperlukan.`,
      source: "system",
      status: "OPEN",
    });
  }

  // ── 2. Ratio-based findings ──
  for (const ratio of analysis.ratios) {
    if (ratio.verdict === "KURANG" || ratio.verdict === "WASPADA") {
      findings.push({
        id: `F-${String(++idx).padStart(3, "0")}`,
        area: "ACCOUNTING",
        title: `${ratio.label} dalam kategori ${ratio.verdict}`,
        severity: ratio.verdict === "KURANG" ? "HIGH" : "MEDIUM",
        description: `${ratio.label}: ${ratio.value === null ? "N/A" : ratio.value.toFixed(2)} (benchmark: ${ratio.benchmark}). ${ratio.note}`,
        impact: `Kinerja keuangan di bawah standar industri untuk ${ratio.label.toLowerCase()}. Dapat mempengaruhi kapasitas pendanaan dan penilaian kreditur.`,
        recommendation: `Analisis akar penyebab ${ratio.label.toLowerCase()} yang rendah. ${ratio.verdict === "KURANG" ? "Susun rencana aksi perbaikan dengan target kuantitatif dalam 90 hari." : "Pantau tren bulanan dan tetapkan threshold peringatan dini."}`,
        source: "system",
        status: "OPEN",
      });
    }
  }

  // ── 3. Tax findings ──
  if (taxAnalysis) {
    const taxRatio = taxAnalysis.taxRatio.value;
    if (taxRatio !== null && (taxRatio > 0.30 || taxRatio < 0.05)) {
      findings.push({
        id: `F-${String(++idx).padStart(3, "0")}`,
        area: "TAX",
        title: `Tax Ratio ${taxRatio > 0.30 ? "di atas" : "di bawah"} batas wajar`,
        severity: taxRatio > 0.40 ? "HIGH" : "MEDIUM",
        description: `Tax ratio tercatat ${(taxRatio * 100).toFixed(1)}% dari laba sebelum pajak. ${taxAnalysis.taxRatio.note}`,
        impact: `Risiko pemeriksaan pajak dan potensi kurang bayar ${taxRatio < 0.05 ? "(tax ratio terlalu rendah)" : "(tax ratio tinggi — beban pajak tidak efisien)"}.`,
        recommendation: taxRatio > 0.30
          ? "Evaluasi strategi perencanaan pajak. Pertimbangkan pemanfaatan insentif fiskal yang tersedia."
          : "Verifikasi kelengkapan pelaporan pajak. Pastikan seluruh objek pajak telah dilaporkan sesuai ketentuan.",
        source: "system",
        status: "OPEN",
      });
    }
  }

  // ── 4. SLA / Process findings ──
  if (slaBreaches && slaBreaches.length > 0) {
    for (const b of slaBreaches.slice(0, 3)) {
      findings.push({
        id: `F-${String(++idx).padStart(3, "0")}`,
        area: "PROCESS",
        title: `Bottleneck proses: ${b.stage}`,
        severity: b.rate > 25 ? "HIGH" : "MEDIUM",
        description: `Tahap ${b.stage} mengalami ${b.count} breach SLA (${b.rate.toFixed(0)}% dari total task).`,
        impact: "Keterlambatan penyelesaian laporan keuangan. Dapat menyebabkan penalti keterlambatan pelaporan dan ketidakpuasan klien.",
        recommendation: `Tinjau alur kerja tahap ${b.stage}. Identifikasi bottleneck dan alokasikan sumber daya tambahan atau sederhanakan prosedur.`,
        source: "system",
        status: "OPEN",
      });
    }
  }

  // ── 5. Quality Metrics ──
  if (qualityMetrics && qualityMetrics.avgConfidenceAll !== null && qualityMetrics.avgConfidenceAll < 0.85) {
    findings.push({
      id: `F-${String(++idx).padStart(3, "0")}`,
      area: "INTERNAL_CONTROL",
      title: "Tingkat kepercayaan AI di bawah threshold",
      severity: qualityMetrics.avgConfidenceAll < 0.70 ? "HIGH" : "MEDIUM",
      description: `Confidence score AI untuk auto-classification tercatat ${(qualityMetrics.avgConfidenceAll * 100).toFixed(0)}%, di bawah threshold 85%.`,
      impact: "Risiko salah klasifikasi akun yang dapat menyebabkan kesalahan dalam laporan keuangan.",
      recommendation: "Tingkatkan persentase review manual untuk jurnal dengan confidence < 85%. Evaluasi dan perbarui COA mapping jika diperlukan.",
      source: "system",
      status: "OPEN",
    });
  }

  // ── 6. General IT Control ──
  findings.push({
    id: `F-${String(++idx).padStart(3, "0")}`,
    area: "IT",
    title: "Backup dan disaster recovery",
    severity: "MEDIUM",
    description: "Data keuangan klien diproses melalui pipeline cloud. Verifikasi berkala atas backup dan recovery procedure direkomendasikan.",
    impact: "Kehilangan data dapat mengganggu kelangsungan operasional dan pelaporan.",
    recommendation: "Implementasikan verifikasi backup bulanan dan uji recovery tahunan. Dokumentasikan RTO dan RPO.",
    source: "system",
    status: "OPEN",
  });

  // ── Merge prior findings ──
  if (priorFindings) findings.push(...priorFindings);

  // ── Summary ──
  const sevCounts = (s: Severity) => findings.filter((f) => f.severity === s && f.source === "system").length;
  const resolved = findings.filter((f) => f.status === "RESOLVED").length;

  // ── Narrative ──
  const narrative: string[] = [];
  narrative.push(
    `Periode ${period}, kami telah menyelesaikan review atas laporan keuangan ${clientName} dan mengidentifikasi ${findings.length} temuan yang memerlukan perhatian manajemen.`,
  );
  if (sevCounts("HIGH") > 0) {
    narrative.push(
      `Terdapat ${sevCounts("HIGH")} temuan berprioritas TINGGI yang memerlukan tindakan segera untuk menghindari dampak material pada laporan keuangan.`,
    );
  }
  if (sevCounts("MEDIUM") > 0) {
    narrative.push(
      `${sevCounts("MEDIUM")} temuan berprioritas SEDANG memerlukan tindakan dalam 90 hari ke depan untuk memperkuat pengendalian internal.`,
    );
  }
  if (resolved > 0) {
    narrative.push(
      `Kami mengapresiasi bahwa ${resolved} temuan dari periode sebelumnya telah ditindaklanjuti dan diselesaikan oleh manajemen.`,
    );
  }
  narrative.push(
    "Kami merekomendasikan manajemen untuk meninjau setiap temuan, menetapkan penanggung jawab, dan menyusun rencana tindak lanjut dengan batas waktu yang jelas.",
  );

  return {
    clientName,
    period,
    preparedFor: preparedFor || `Manajemen ${clientName}`,
    preparedBy: preparedBy || "Tim Akuntan Praktis",
    date: new Date().toISOString().slice(0, 10),
    reference: reference || `ML-${period}-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    executiveSummary: `Surat ini merangkum temuan signifikan dari review laporan keuangan ${clientName} untuk periode ${period}. Kami mengidentifikasi ${sevCounts("HIGH")} temuan prioritas tinggi dan ${sevCounts("MEDIUM")} temuan prioritas sedang yang memerlukan perhatian dan tindakan manajemen.`,
    scope: `Review mencakup analisis neraca saldo, rasio keuangan, kewajaran saldo akun, analisis pajak, kepatuhan SLA proses, dan pengendalian internal berbasis sistem. Periode review: ${period}.`,
    findings,
    summary: {
      high: sevCounts("HIGH"),
      medium: sevCounts("MEDIUM"),
      low: sevCounts("LOW"),
      observation: sevCounts("OBSERVATION"),
      total: findings.length,
      resolved,
    },
    narrative,
  };
}

// ── Export Formatters ─────────────────────────────────────────────────────────

export function managementLetterMarkdown(ml: ManagementLetter): string {
  const out: string[] = [];
  out.push(`# SURAT KEPADA MANAJEMEN (MANAGEMENT LETTER)`);
  out.push("");
  out.push(`**Kepada:** ${ml.preparedFor}`);
  out.push(`**Dari:** ${ml.preparedBy}`);
  out.push(`**Tanggal:** ${ml.date}`);
  out.push(`**Referensi:** ${ml.reference}`);
  out.push(`**Periode:** ${ml.period}`);
  out.push("");
  out.push("---");
  out.push("");
  out.push("## 1. Ringkasan Eksekutif");
  out.push("");
  out.push(ml.executiveSummary);
  out.push("");
  out.push("## 2. Ruang Lingkup & Pendekatan");
  out.push("");
  out.push(ml.scope);
  out.push("");
  out.push("## 3. Ikhtisar Temuan");
  out.push("");
  out.push(`| Prioritas | Jumlah |`);
  out.push(`|---|---|`);
  out.push(`| 🔴 Tinggi | ${ml.summary.high} |`);
  out.push(`| 🟡 Sedang | ${ml.summary.medium} |`);
  out.push(`| 🟢 Rendah | ${ml.summary.low} |`);
  out.push(`| ℹ️ Observasi | ${ml.summary.observation} |`);
  out.push(`| **Total** | **${ml.summary.total}** |`);
  out.push(`| ✅ Terselesaikan | ${ml.summary.resolved} |`);
  out.push("");

  out.push("## 4. Temuan & Rekomendasi");
  out.push("");

  const sevOrder: Severity[] = ["HIGH", "MEDIUM", "LOW", "OBSERVATION"];
  const sevLabel: Record<Severity, string> = {
    HIGH: "🔴 PRIORITAS TINGGI",
    MEDIUM: "🟡 PRIORITAS SEDANG",
    LOW: "🟢 PRIORITAS RENDAH",
    OBSERVATION: "ℹ️ OBSERVASI",
  };

  for (const sev of sevOrder) {
    const fList = ml.findings.filter((f) => f.severity === sev);
    if (fList.length === 0) continue;
    out.push(`### ${sevLabel[sev]}`);
    out.push("");
    for (const f of fList) {
      out.push(`#### ${f.id}: ${f.title}`);
      out.push(`- **Area:** ${f.area}`);
      out.push(`- **Status:** ${f.status}`);
      out.push(`- **Deskripsi:** ${f.description}`);
      out.push(`- **Dampak:** ${f.impact}`);
      out.push(`- **Rekomendasi:** ${f.recommendation}`);
      if (f.managementResponse) out.push(`- **Tanggapan Manajemen:** ${f.managementResponse}`);
      out.push("");
    }
  }

  out.push("## 5. Tindak Lanjut");
  out.push("");
  for (const n of ml.narrative) out.push(n);
  out.push("");
  out.push("---");
  out.push("");
  out.push("*Surat ini dibuat berdasarkan data yang tersedia dalam sistem Praktis per tanggal pelaporan. Manajemen bertanggung jawab untuk meninjau, menanggapi, dan menindaklanjuti setiap temuan.*");

  return out.join("\n");
}

export function managementLetterCsv(ml: ManagementLetter): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const out: string[] = ["ID,AREA,SEVERITY,STATUS,JUDUL,DESKRIPSI,DAMPAK,REKOMENDASI,TANGGAPAN"];
  for (const f of ml.findings) {
    out.push(
      [f.id, f.area, f.severity, f.status, f.title, f.description, f.impact, f.recommendation, f.managementResponse ?? ""]
        .map(esc).join(","),
    );
  }
  return out.join("\n");
}
