import { readFileSync } from "node:fs";
import { ocrImageLocal } from "./src/ai/local-ocr";

async function main() {
  console.log("start...");
  const buf = readFileSync("/tmp/ocr-test.png");
  console.log("read ok, running OCR...");
  const text = await ocrImageLocal(buf);
  console.log("=== HASIL ===");
  console.log(text.slice(0, 400));
}
main().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
