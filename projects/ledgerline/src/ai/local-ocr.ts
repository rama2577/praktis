import { createWorker, type Worker } from "tesseract.js";
import path from "node:path";

/**
 * OCR internal (lokal, gratis) — tesseract.js wasm.
 * Bahasa: Indonesia + Inggris (tessdata_fast, ~2,6MB total).
 * Worker di-reuse antar dokumen (singleton) untuk hemat memory.
 *
 * Pipeline OCR berlapis: OCR lokal dulu → LLM vision hanya fallback
 * (lihat src/ai/parsers.ts `ocrBufferWithFallback`).
 */

const LANG_PATH = path.join(process.cwd(), "src", "ai", "tessdata");
const LANGS = ["ind", "eng"];

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(LANGS, 1, { langPath: LANG_PATH });
  }
  return workerPromise;
}

/** OCR lokal pada buffer gambar (JPEG/PNG). Return teks mentah (trim). */
export async function ocrImageLocal(buffer: Buffer): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  return (data.text ?? "").trim();
}

/** Terminate worker (dipakai saat shutdown/test). */
export async function resetOcrWorker(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}

/** Mode mesin OCR: local (default, gratis) | vision (LLM) | auto (local→vision fallback). */
export type OcrEngineMode = "local" | "vision" | "auto";

export function ocrEngineMode(): OcrEngineMode {
  const v = (process.env.OCR_ENGINE ?? "auto").toLowerCase();
  return v === "local" || v === "vision" ? v : "auto";
}
