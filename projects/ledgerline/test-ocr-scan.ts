import { readFileSync } from "node:fs";
import { ocrScannedPdf } from "./src/ai/parsers";

// Mode LOCAL murni: tanpa LLM (env GLM dikosongkan) — buktikan OCR internal jalan sendiri.
async function main() {
  const buf = readFileSync("/tmp/scan-faktur.pdf");
  const text = await ocrScannedPdf(buf);
  console.log("=== OCR LOKAL PDF SCAN ===");
  console.log(text.slice(0, 700));
  console.log("=== END ===");
}
main().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
