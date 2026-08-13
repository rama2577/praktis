import { PDFParse } from "pdf-parse";
import ExcelJS from "exceljs";
import path from "node:path";
import { getLlmConfig, isLLMConfigured, visionCompletion } from "@/ai/llm";
import { readStoredFile } from "@/lib/storage";
import type { Document } from "@prisma/client";

/**
 * Ekstrak teks dari dokumen sesuai ekstensi. File dibaca dari storage
 * (dekripsi AES-256-GCM otomatis di `readStoredFile`). Lempar error jika gagal.
 */
export async function parseDocument(doc: Document): Promise<string> {
  const ext = path.extname(doc.fileName).toLowerCase();
  const buffer = await readStoredFile(doc.filePath);

  switch (ext) {
    case ".pdf":
      return parsePdf(buffer);
    case ".xlsx":
      return parseXlsx(buffer);
    case ".jpg":
    case ".jpeg":
      return parseImage(buffer);
    default:
      throw new Error(`Format tidak didukung: ${ext}`);
  }
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text?.trim() ?? "";
  if (!text) throw new Error("Tidak ada teks yang dapat diekstrak dari PDF");
  return text;
}

async function parseXlsx(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
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

async function parseImage(buffer: Buffer): Promise<string> {
  if (!isLLMConfigured()) {
    throw new Error("Dokumen gambar memerlukan LLM vision — atur LLM_API_KEY terlebih dahulu");
  }
  const cfg = getLlmConfig();
  const base64 = buffer.toString("base64");
  const mime = "image/jpeg";

  // Pass 1: model vision default (hemat).
  let content = await visionCompletion({
    imageBase64: base64,
    mime,
    timeoutMs: 90_000,
  });

  // Pass 2: hasil mencurigakan → ulangi dengan strong model (glm-4.6).
  if (looksLikeFailedOcr(content) && cfg.strongModel && cfg.strongModel !== cfg.visionModel) {
    content = await visionCompletion({
      imageBase64: base64,
      mime,
      model: cfg.strongModel,
      timeoutMs: 120_000,
    });
  }

  const text = content.trim();
  if (!text) throw new Error("LLM vision tidak mengembalikan teks");
  return text;
}
