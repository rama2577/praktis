/**
 * AI Variance Decomposition — analisis "mengapa" angka berubah.
 * Menggunakan LLM (via chatCompletion) untuk menghasilkan narasi
 * dekomposisi varians: volume × price × mix.
 *
 * Big 4 standard: setiap perubahan material harus dijelaskan pemicunya.
 * Pertanyaan #1 klien: "Kenapa laba turun/naik?"
 */

import { chatCompletion } from "@/ai/llm";
import { formatCurrencyRp } from "@/lib/format";
import type { TrialBalanceRow } from "./trial-balance";
import type { Analysis } from "./financial-analysis";

export type AccountDelta = {
  accountCode: string;
  accountName: string;
  classification: string;
  currentBalance: number;
  priorBalance: number | null;
  delta: number | null;
  deltaPct: number | null;
  direction: "up" | "down" | "flat" | "new" | "gone";
};

export type VarianceDecomposition = {
  clientName: string;
  currentPeriod: string;
  priorPeriod: string;
  topIncreases: AccountDelta[];
  topDecreases: AccountDelta[];
  summary: {
    pendapatanDelta: number | null;
    pendapatanDeltaPct: number | null;
    bebanDelta: number | null;
    bebanDeltaPct: number | null;
    labaDelta: number | null;
    labaDeltaPct: number | null;
  };
  narrative: string; // AI-generated
  keyDrivers: string[]; // top 3 drivers distilled
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function classLabel(c: string): string {
  const m: Record<string, string> = {
    ASET: "Aset", LIABILITAS: "Liabilitas", EKUITAS: "Ekuitas",
    PENDAPATAN: "Pendapatan", BEBAN: "Beban", LAINNYA: "Lainnya",
  };
  return m[c] ?? c;
}

function deltaDirection(current: number, prior: number | null): AccountDelta["direction"] {
  if (prior === null || prior === undefined) return "new";
  if (current === 0 && prior === 0) return "flat";
  const d = current - prior;
  if (Math.abs(d) < 100) return "flat";
  return d > 0 ? "up" : "down";
}

/** Bangun delta dari dua set trial balance. */
function buildDeltas(
  currentRows: TrialBalanceRow[],
  priorRows: TrialBalanceRow[],
): AccountDelta[] {
  const priorMap = new Map(priorRows.map((r) => [r.accountCode, r]));
  return currentRows.map((r) => {
    const prior = priorMap.get(r.accountCode);
    const priorBal = prior?.balance ?? null;
    const delta = priorBal !== null ? r.balance - priorBal : null;
    const deltaPct = priorBal !== null && priorBal !== 0 ? (delta! / Math.abs(priorBal)) * 100 : null;
    return {
      accountCode: r.accountCode,
      accountName: r.accountName,
      classification: r.classification,
      currentBalance: r.balance,
      priorBalance: priorBal,
      delta,
      deltaPct,
      direction: deltaDirection(r.balance, priorBal),
    };
  });
}

function fmtDelta(d: AccountDelta): string {
  const sign = (d.delta ?? 0) >= 0 ? "+" : "";
  return `${sign}${formatCurrencyRp(d.delta ?? 0)} (${d.deltaPct !== null ? (d.deltaPct >= 0 ? "+" : "") + d.deltaPct.toFixed(1) + "%" : "baru"})`;
}

/** Extract top increases & decreases (by absolute delta), pendapatan + beban only. */
function topChanges(deltas: AccountDelta[], limit = 5) {
  const relevant = deltas.filter(
    (d) => d.classification === "PENDAPATAN" || d.classification === "BEBAN",
  );
  const sorted = [...relevant].sort(
    (a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0),
  );
  return {
    increases: sorted.filter((d) => (d.delta ?? 0) > 0).slice(0, limit),
    decreases: sorted.filter((d) => (d.delta ?? 0) < 0).slice(0, limit),
  };
}

// ── AI Narrative ─────────────────────────────────────────────────────────────

async function generateVarianceNarrative(
  clientName: string,
  currentPeriod: string,
  priorPeriod: string,
  increases: AccountDelta[],
  decreases: AccountDelta[],
  summary: VarianceDecomposition["summary"],
): Promise<string> {
  const increaseLines = increases.map(
    (d) => `- ${d.accountName} (${classLabel(d.classification)}): ${fmtDelta(d)}`,
  );
  const decreaseLines = decreases.map(
    (d) => `- ${d.accountName} (${classLabel(d.classification)}): ${fmtDelta(d)}`,
  );

  const prompt = `Anda adalah Senior Accountant Big 4. Analisis varians berikut untuk ${clientName} dari ${priorPeriod} ke ${currentPeriod}:

RINGKASAN:
- Pendapatan: ${summary.pendapatanDeltaPct !== null ? (summary.pendapatanDeltaPct >= 0 ? "+" : "") + summary.pendapatanDeltaPct.toFixed(1) + "%" : "N/A"}
- Beban: ${summary.bebanDeltaPct !== null ? (summary.bebanDeltaPct >= 0 ? "+" : "") + summary.bebanDeltaPct.toFixed(1) + "%" : "N/A"}
- Laba Bersih: ${summary.labaDeltaPct !== null ? (summary.labaDeltaPct >= 0 ? "+" : "") + summary.labaDeltaPct.toFixed(1) + "%" : "N/A"}

KENAIKAN TERBESAR:
${increaseLines.join("\n") || "(tidak ada)"}

PENURUNAN TERBESAR:
${decreaseLines.join("\n") || "(tidak ada)"}

TUGAS:
Buat narasi analisis varians dalam 3 paragraf BAHASA INDONESIA:
1. Paragraf 1: Jelaskan perubahan pendapatan — apa pemicu utamanya (volume, harga, bauran produk)? Jika data spesifik tidak tersedia, berikan analisis logis berdasarkan akun yang berubah.
2. Paragraf 2: Jelaskan perubahan beban — beban apa yang naik/turun signifikan, dan apa implikasinya pada margin?
3. Paragraf 3: Berikan penilaian overall tentang kesehatan keuangan dan 1-2 rekomendasi tindakan untuk manajemen.

Format: narasi langsung, tanpa bullet points, tanpa header. Gaya profesional Big 4. Fokus pada insight, bukan menyebutkan ulang angka.`;

  try {
    const result = await chatCompletion({
      system: "Anda adalah Senior Accountant Big 4 yang menulis analisis varians dalam Bahasa Indonesia profesional.",
      user: prompt,
    });
    return result.trim();
  } catch {
    return generateFallbackNarrative(clientName, currentPeriod, priorPeriod, summary, increases, decreases);
  }
}

/** Narasi fallback rule-based jika LLM tidak tersedia. */
function generateFallbackNarrative(
  clientName: string,
  currentPeriod: string,
  priorPeriod: string,
  summary: VarianceDecomposition["summary"],
  increases: AccountDelta[],
  decreases: AccountDelta[],
): string {
  const parts: string[] = [];
  parts.push(
    `Periode ${currentPeriod}, pendapatan ${clientName} ${summary.pendapatanDeltaPct !== null ? `berubah ${Math.abs(summary.pendapatanDeltaPct).toFixed(1)}%` : "stabil"} dibandingkan ${priorPeriod}.`,
  );
  if (increases.length > 0) {
    parts.push(
      `Pendorong utama kenaikan: ${increases.slice(0, 2).map((d) => d.accountName).join(" dan ")}.`,
    );
  }
  if (decreases.length > 0) {
    parts.push(
      `Faktor penurunan: ${decreases.slice(0, 2).map((d) => d.accountName).join(" dan ")}.`,
    );
  }
  const labaDelta = summary.labaDelta ?? 0;
  parts.push(
    labaDelta >= 0
      ? `Secara keseluruhan, laba bersih meningkat ${summary.labaDeltaPct?.toFixed(1)}% — kinerja positif. Manajemen disarankan untuk mempertahankan efisiensi dan mengeksplorasi peluang pertumbuhan.`
      : `Secara keseluruhan, laba bersih menurun ${Math.abs(summary.labaDeltaPct ?? 0).toFixed(1)}%. Manajemen perlu mengevaluasi struktur beban dan strategi penetapan harga.`,
  );
  return parts.join(" ");
}

function distillKeyDrivers(narrative: string, increases: AccountDelta[], decreases: AccountDelta[]): string[] {
  const drivers: string[] = [];
  const top3 = [...increases, ...decreases]
    .filter((d) => d.deltaPct !== null && Math.abs(d.deltaPct) > 10)
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
    .slice(0, 3);
  for (const d of top3) {
    const dir = (d.delta ?? 0) >= 0 ? "↑" : "↓";
    drivers.push(`${dir} ${d.accountName}: ${Math.abs(d.deltaPct!).toFixed(0)}%`);
  }
  if (drivers.length === 0 && increases.length > 0) {
    drivers.push(`${increases[0]!.accountName} naik signifikan`);
  }
  return drivers;
}

// ── Main Builder ─────────────────────────────────────────────────────────────

export async function buildVarianceDecomposition(
  currentRows: TrialBalanceRow[],
  priorRows: TrialBalanceRow[],
  clientName: string,
  currentPeriod: string,
  priorPeriod: string,
): Promise<VarianceDecomposition> {
  const deltas = buildDeltas(currentRows, priorRows);
  const { increases, decreases } = topChanges(deltas);

  const sumByClass = (cls: string, rs: TrialBalanceRow[]) =>
    rs.filter((r) => r.classification === cls).reduce((s, r) => s + r.balance, 0);

  const curPendapatan = sumByClass("PENDAPATAN", currentRows);
  const curBeban = sumByClass("BEBAN", currentRows);
  const curLaba = curPendapatan - curBeban;
  const priPendapatan = sumByClass("PENDAPATAN", priorRows);
  const priBeban = sumByClass("BEBAN", priorRows);
  const priLaba = priPendapatan - priBeban;

  const computeSummary = (cur: number, pri: number) => {
    const d = cur - pri;
    const pct = pri !== 0 ? (d / Math.abs(pri)) * 100 : null;
    return { delta: d, deltaPct: pct };
  };

  const pendSum = computeSummary(curPendapatan, priPendapatan);
  const bebanSum = computeSummary(curBeban, priBeban);
  const labaSum = computeSummary(curLaba, priLaba);

  const summary = {
    pendapatanDelta: pendSum.delta,
    pendapatanDeltaPct: pendSum.deltaPct,
    bebanDelta: bebanSum.delta,
    bebanDeltaPct: bebanSum.deltaPct,
    labaDelta: labaSum.delta,
    labaDeltaPct: labaSum.deltaPct,
  };

  const narrative = await generateVarianceNarrative(
    clientName, currentPeriod, priorPeriod, increases, decreases, summary,
  );
  const keyDrivers = distillKeyDrivers(narrative, increases, decreases);

  return {
    clientName,
    currentPeriod,
    priorPeriod,
    topIncreases: increases,
    topDecreases: decreases,
    summary,
    narrative,
    keyDrivers,
  };
}
