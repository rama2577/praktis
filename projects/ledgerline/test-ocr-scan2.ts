import { readFileSync } from "node:fs";
import { ocrImageLocal } from "./src/ai/local-ocr";

async function main() {
  const mupdf = await import("mupdf");
  const buf = readFileSync("/tmp/scan-faktur.pdf");
  const doc = mupdf.Document.openDocument(new Uint8Array(buf), "application/pdf");
  const page = doc.loadPage(0);
  const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true);
  const png = Buffer.from(pixmap.asPNG());
  console.log("render PNG OK:", png.length, "bytes");
  const text = await ocrImageLocal(png);
  console.log("=== OCR LOKAL (render mupdf → tesseract) ===");
  console.log(text.slice(0, 700));
}
main().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
