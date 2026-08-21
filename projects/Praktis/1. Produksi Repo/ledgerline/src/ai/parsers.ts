import { PDFParse } from "pdf-parse";
import ExcelJS from "exceljs";
import path from "node:path";
import { getLlmConfig, isLLMConfigured, visionCompletion } from "@/ai/llm";
import { ocrEngineMode, ocrImageLocal } from "@/ai/local-ocr";
import { readStoredFile } from "@/lib/storage";
import { decodeQrPng, parseEfakturQr, qrToText } from "@/ai/qr";
import type { Document } from "@prisma/client";

/**
 * Ekstrak teks dari dokumen sesuai ekstensi. File dibaca dari storage
 * (dekripsi AES-256-GCM otomatis di `readStoredFile`). Lempar error jika gagal.
 */
export async function parseDocument(doc: Document): Promise<string> {
  return (await parseDocumentDetailed(doc)).text;
}

/** Meta hasil parse — dipakai observability (biaya & kualitas hybrid OCR). */
export type OcrMeta = {
  engine: "local" | "vision" | "pdf-text" | "xlsx" | "unknown";
  usedVision: boolean;
  usedStrong: boolean;
  pageCount: number;
  durationMs: number;
  textChars: number;
};

/**
 * Parse + metrik (hybrid OCR): teks digital/xlsx tanpa OCR; gambar & PDF scan
 * lewat OCR lokal (tesseract) dulu, vision LLM hanya fallback.
 */
export async function parseDocumentDetailed(doc: Document): Promise<{ text: string; meta: OcrMeta }> {
  const ext = path.extname(doc.fileName).toLowerCase();
  const buffer = await readStoredFile(doc.filePath);
  const started = Date.now();

  switch (ext) {
    case ".pdf": {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const text = result.text?.trim() ?? "";
      if (text) {
        return {
          text,
          meta: { engine: "pdf-text", usedVision: false, usedStrong: false, pageCount: 1, durationMs: Date.now() - started, textChars: text.length },
        };
      }
      const scanned = await ocrScannedPdf(buffer);
      return { text: scanned.text, meta: { ...scanned.meta, engine: scanned.meta.usedVision ? "vision" : "local", durationMs: Date.now() - started } };
    }
    case ".xlsx": {
      const text = await parseXlsx(buffer);
      return { text, meta: { engine: "xlsx", usedVision: false, usedStrong: false, pageCount: 1, durationMs: Date.now() - started, textChars: text.length } };
    }
    case ".jpg":
    case ".jpeg": {
      const parsed = await parseImage(buffer);
      return { text: parsed.text, meta: { ...parsed.meta, durationMs: Date.now() - started } };
    }
    default:
      throw new Error(`Format tidak didukung: ${ext}`);
  }
}

/** Batas halaman yang di-OCR utk PDF scan (demo/performance guard). */
export const MAX_OCR_PDF_PAGES = 10;

/**
 * OCR PDF scan: render tiap halaman ke PNG (mupdf wasm) lalu ekstrak via
 * vision LLM — dengan heuristik kualitas + retry strong model (sama spt gambar).
 */
export async function ocrScannedPdf(buffer: Buffer): Promise<{ text: string; meta: OcrMeta }> {
  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(new Uint8Array(buffer), "application/pdf");
  const total = doc.countPages();
  const pages = Math.min(total, MAX_OCR_PDF_PAGES);
  const parts: string[] = [];
  const matrix = mupdf.Matrix.scale(2, 2);
  let usedVision = false;
  let usedStrong = false;

  for (let i = 0; i < pages; i++) {
    const page = doc.loadPage(i);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
    const png = Buffer.from(pixmap.asPNG());

    // T2.3 — coba decode QR e-Faktur dari halaman (faktur elektronik).
    let qrText = "";
    try {
      const qrRaw = decodeQrPng(png);
      if (qrRaw) qrText = qrToText(parseEfakturQr(qrRaw));
    } catch {
      /* QR opsional — abaikan jika gagal decode */
    }

    let trimmed: string;
    try {
      const result = await ocrBufferWithFallback(png, "image/png");
      trimmed = result.text;
      usedVision = usedVision || result.usedVision;
      usedStrong = usedStrong || result.usedStrong;
    } catch (err) {
      console.warn(`[ocr] halaman ${i + 1} gagal:`, (err as Error).message);
      trimmed = "";
    }
    const qrBlock = qrText ? `\n--- QR e-Faktur ---\n${qrText}` : "";
    parts.push(trimmed ? `--- Halaman ${i + 1} ---\n${trimmed}${qrBlock}` : `--- Halaman ${i + 1} ---${qrBlock || "\n[tidak terbaca]"}`);
  }

  const text = parts.join("\n\n").trim();
  if (!text) throw new Error("OCR PDF scan tidak menghasilkan teks");
  return {
    text,
    meta: {
      engine: usedVision ? "vision" : "local",
      usedVision,
      usedStrong,
      pageCount: pages,
      durationMs: 0,
      textChars: text.length,
    },
  };
}

async function parseXlsx(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const lines: string[] = [];
  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount === 0) continue;
    const limit = Math.min(sheet.rowCount, 200);
    for (let r = 1; r <= limit; r++) {
      const row = sheet.getRow(r);
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.text?.trim() ?? "";
        if (v) cells.push(v);
      });
      if (cells.length > 0) lines.push(cells.join(" | "));
    }
  }
  const text = lines.join("\n").trim();
  if (!text) throw new Error("Tidak ada data yang dapat dibaca dari XLSX");
  return text;
}

/**
 * Heuristik kualitas hasil OCR. Retry kuat diperlukan bila:
 * - hasil terlalu pendek (kemungkinan scan gagal / model menolak), atau
 * - rasio karakter alfanumerik rendah (garbage/hallucination).
 */
export const MIN_OCR_CHARS = 24;
export function looksLikeFailedOcr(text: string): boolean {
  const t = text.trim();
  if (t.length < MIN_OCR_CHARS) return true;
  const alphaNum = t.replace(/[^a-zA-Z0-9\u00C0-\u024F%.,:;()/\- ]/g, "").length;
  return alphaNum / t.length < 0.4;
}

/**
 * OCR berlapis: OCR lokal (tesseract, gratis) dulu — LLM vision hanya fallback
 * saat hasil lokal jelek (mode auto) atau saat OCR_ENGINE=vision.
 * Bila LLM tidak dikonfigurasi & mode local, hasil lokal dipakai apa adanya.
 */
async function ocrBufferWithFallback(buffer: Buffer, mime: string): Promise<{ text: string; usedVision: boolean; usedStrong: boolean }> {
  const engine = ocrEngineMode();
  let text = "";
  let usedVision = false;
  let usedStrong = false;

  if (engine !== "vision") {
    try {
      text = await ocrImageLocal(buffer);
    } catch (err) {
      console.warn("[ocr] local gagal, fallback vision:", (err as Error).message);
    }
  }

  const canVision = isLLMConfigured();
  const needBetter = engine === "vision" || (engine === "auto" && (!text || looksLikeFailedOcr(text)));
  if (canVision && needBetter) {
    const vision = await ocrVisionWithRetry(buffer, mime);
    text = vision.text;
    usedVision = true;
    usedStrong = vision.usedStrong;
  }

  const trimmed = text.trim();
  if (!trimmed) throw new Error("OCR tidak menghasilkan teks");
  return { text: trimmed, usedVision, usedStrong };
}

/** Vision LLM + retry strong model saat hasil mencurigakan (jalur fallback). */
async function ocrVisionWithRetry(buffer: Buffer, mime: string): Promise<{ text: string; usedStrong: boolean }> {
  const cfg = getLlmConfig();
  const base64 = buffer.toString("base64");
  let content = await visionCompletion({ imageBase64: base64, mime, timeoutMs: 90_000 });
  let usedStrong = false;
  if (looksLikeFailedOcr(content) && cfg.strongModel && cfg.strongModel !== cfg.visionModel) {
    content = await visionCompletion({
      imageBase64: base64,
      mime,
      model: cfg.strongModel,
      timeoutMs: 120_000,
    });
    usedStrong = true;
  }
  return { text: content.trim(), usedStrong };
}

async function parseImage(buffer: Buffer): Promise<{ text: string; meta: OcrMeta }> {
  const result = await ocrBufferWithFallback(buffer, "image/jpeg");
  return {
    text: result.text,
    meta: {
      engine: result.usedVision ? "vision" : "local",
      usedVision: result.usedVision,
      usedStrong: result.usedStrong,
      pageCount: 1,
      durationMs: 0,
      textChars: result.text.length,
    },
  };
}
