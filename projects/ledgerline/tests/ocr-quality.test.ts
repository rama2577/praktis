import { describe, expect, it } from "vitest";
import { looksLikeFailedOcr, MIN_OCR_CHARS } from "@/ai/parsers";

describe("looksLikeFailedOcr — heuristik kualitas hasil OCR", () => {
  it("teks lengkap normal → tidak perlu retry", () => {
    const text =
      "PT MAJU JAYA\nJl. Sudirman No. 12, Jakarta\nFAKTUR PAJAK No. 010.000-22.12345678\nTanggal: 12 Januari 2026\nDPP: Rp 12.500.000\nPPN 11%: Rp 1.375.000\nTotal: Rp 13.875.000";
    expect(looksLikeFailedOcr(text)).toBe(false);
  });

  it("hasil terlalu pendek (kemungkinan scan gagal) → retry", () => {
    expect(looksLikeFailedOcr("")).toBe(true);
    expect(looksLikeFailedOcr("   ")).toBe(true);
    expect(looksLikeFailedOcr("Rp")).toBe(true);
    expect(looksLikeFailedOcr("x".repeat(MIN_OCR_CHARS - 1))).toBe(true);
  });

  it("garbage simbol (hallucination) → retry", () => {
    expect(looksLikeFailedOcr("§§§§ §§§§ §§§§ §§§§ §§§§ §§§§ §§§§")).toBe(true);
    expect(looksLikeFailedOcr("─── ─── ─── ─── ─── ─── ─── ───")).toBe(true);
  });

  it("teks dengan angka & pemisah format → normal", () => {
    const text = "Nomor: 010.000-22.12345678\nRp 1.375.000\n12/01/2026\nPT Contoh Sejahtera";
    expect(looksLikeFailedOcr(text)).toBe(false);
  });

  it("teks cukup panjang meski minim huruf → tidak retry (angka/tanggal valid)", () => {
    const text = "1234567890 1234567890 1234567890 1234567890 1234567890 1234567890";
    expect(looksLikeFailedOcr(text)).toBe(false);
  });
});
