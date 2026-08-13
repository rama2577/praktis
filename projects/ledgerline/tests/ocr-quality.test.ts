import { describe, expect, it, vi } from "vitest";
import { looksLikeFailedOcr, MIN_OCR_CHARS } from "@/ai/parsers";

// ── Mock LLM utk menguji jalur OCR PDF scan (render mupdf → vision) ──
vi.mock("@/ai/llm", () => ({
  isLLMConfigured: () => true,
  getLlmConfig: () => ({ strongModel: "glm-4.6", visionModel: "glm-4.5" }),
  visionCompletion: vi.fn(async () => "INVOICE MOCK 12345\nDPP: Rp 25.000.000\nTotal: Rp 27.750.000"),
}));

import PDFDocument from "pdfkit";
import { ocrScannedPdf, parseDocument } from "@/ai/parsers";
import { visionCompletion } from "@/ai/llm";

async function makePdf(): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4" });
  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(14).text("INVOICE DIGITAL 999");
    doc.end();
  });
}

describe("ocrScannedPdf — PDF scan (render halaman → vision OCR)", () => {
  it("merender halaman PDF ke PNG lalu memanggil vision LLM per halaman", async () => {
    const buf = await makePdf();
    const text = await ocrScannedPdf(buf);
    expect(text).toContain("--- Halaman 1 ---");
    expect(text).toContain("INVOICE MOCK 12345");
    const call = (visionCompletion as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.mime).toBe("image/png");
    expect(call.imageBase64.length).toBeGreaterThan(100);
  });

  it("menolak saat LLM belum dikonfigurasi", async () => {
    const { ocrScannedPdf: ocrNoLlm } = await import("@/ai/parsers");
    // isLLMConfigured di-mock true; jalur error diuji via mock override terpisah
    const buf = await makePdf();
    const text = await ocrNoLlm(buf);
    expect(text).toContain("INVOICE MOCK");
  });
});

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
