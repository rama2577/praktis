import type { OcrMeta } from "@/ai/parsers";

/**
 * Estimasi biaya OCR hybrid (pure — unit-testable).
 * Vision LLM: ±1.200 token per halaman (image); teks hasil OCR: ±0,25 token/karakter.
 * Rate z.ai: glm-4.5-vision $0,7/M · glm-4.6 (strong) $2,8/M.
 * OCR lokal (tesseract) = $0.
 */

export const OCR_COST_RATES = {
  visionTokensPerPage: 1_200,
  textTokensPerChar: 0.25,
  visionUsdPerMToken: 0.7,
  strongUsdPerMToken: 2.8,
} as const;

/** Estimasi token yang dikonsumsi jalur vision (0 bila hanya OCR lokal). */
export function estimateOcrTokens(meta: Pick<OcrMeta, "usedVision" | "usedStrong" | "pageCount" | "textChars">): number {
  const { visionTokensPerPage, textTokensPerChar } = OCR_COST_RATES;
  const visionPages = meta.usedVision ? meta.pageCount : 0;
  const textTokens = Math.round(meta.textChars * textTokensPerChar);
  return visionPages * visionTokensPerPage + textTokens;
}

/** Estimasi biaya USD (4 desimal). Strong model menggantikan vision utk halaman tsb. */
export function estimateOcrCostUsd(meta: Pick<OcrMeta, "usedVision" | "usedStrong" | "pageCount">): number {
  const { visionTokensPerPage, visionUsdPerMToken, strongUsdPerMToken } = OCR_COST_RATES;
  if (!meta.usedVision) return 0;
  const tokens = meta.pageCount * visionTokensPerPage;
  const rate = meta.usedStrong ? strongUsdPerMToken : visionUsdPerMToken;
  return Math.round((tokens / 1_000_000) * rate * 1_000_000) / 1_000_000;
}

/** Konversi USD → IDR (kurs default 15.800, bisa di-override utk skenario). */
export function usdToIdr(usd: number, rate = 15_800): number {
  return Math.round(usd * rate);
}
