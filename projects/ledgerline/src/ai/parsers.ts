import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";
import { chatCompletion, isLLMConfigured } from "@/ai/llm";
import type { Document } from "@prisma/client";

/** Ekstrak teks dari dokumen sesuai ekstensi. Lempar error jika gagal. */
export async function parseDocument(doc: Document): Promise<string> {
  const fullPath = path.join(process.cwd(), doc.filePath);
  const ext = path.extname(doc.fileName).toLowerCase();

  switch (ext) {
    case ".pdf":
      return parsePdf(fullPath);
    case ".xlsx":
      return parseXlsx(fullPath);
    case ".jpg":
    case ".jpeg":
      return parseImage(fullPath);
    default:
      throw new Error(`Format tidak didukung: ${ext}`);
  }
}

async function parsePdf(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text?.trim() ?? "";
  if (!text) throw new Error("Tidak ada teks yang dapat diekstrak dari PDF");
  return text;
}

async function parseXlsx(filePath: string): Promise<string> {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const lines: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      defval: "",
      header: 1,
    });
    for (const row of rows.slice(0, 200)) {
      const cells = row.filter((c) => c !== "" && c != null);
      if (cells.length > 0) lines.push(cells.join(" | "));
    }
  }
  const text = lines.join("\n").trim();
  if (!text) throw new Error("Tidak ada data yang dapat dibaca dari XLSX");
  return text;
}

async function parseImage(filePath: string): Promise<string> {
  if (!isLLMConfigured()) {
    throw new Error("Dokumen gambar memerlukan LLM vision — atur LLM_API_KEY terlebih dahulu");
  }
  const buffer = await readFile(filePath);
  const base64 = buffer.toString("base64");
  const mime = "image/jpeg";

  const content = await chatCompletion({
    system:
      "Kamu adalah ekstraktor dokumen akuntansi. Ekstrak SEMUA teks dari gambar dokumen ini secara lengkap dan rapi, termasuk angka nominal, tanggal, nama pihak, dan keterangan PPN. Jawab hanya dengan teks hasil ekstraksi.",
    user: `[gambar:${mime};base64:${base64}]`,
    timeoutMs: 90_000,
  });
  const text = content.trim();
  if (!text) throw new Error("LLM vision tidak mengembalikan teks");
  return text;
}
