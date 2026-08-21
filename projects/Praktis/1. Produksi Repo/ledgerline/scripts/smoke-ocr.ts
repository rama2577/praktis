/**
 * Smoke test pipeline dengan LLM nyata (GLM).
 * Jalankan: npx tsx --env-file=.env scripts/smoke-ocr.ts <documentId>
 * - OCR gambar via GLM-4V-Flash (parseDocument)
 * - Draft jurnal via GLM-4-Flash (draftJournalFromText)
 * Membutuhkan GLM_API_KEY di .env.
 */
import { prisma } from "../src/lib/db";
import { parseDocument } from "../src/ai/parsers";
import { draftJournalFromText } from "../src/ai/drafting";

const DOC_ID = process.argv[2];

(async () => {
  if (!DOC_ID) throw new Error("Usage: npx tsx --env-file=.env scripts/smoke-ocr.ts <documentId>");
  const doc = await prisma.document.findUnique({ where: { id: DOC_ID }, include: { client: true } });
  if (!doc) throw new Error("dokumen tidak ditemukan");
  console.log("dokumen:", doc.fileName, "| tipe:", doc.type);

  const t0 = Date.now();
  const text = await parseDocument(doc);
  console.log(`OCR (GLM-4V-Flash): ${text.length} karakter dalam ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log("preview:", text.slice(0, 250).replace(/\n/g, " ⏎ "));

  const t1 = Date.now();
  const draft = await draftJournalFromText({
    text,
    industry: doc.client.industry,
    docType: doc.type,
  });
  console.log(`Draft (GLM-4-Flash): ${((Date.now() - t1) / 1000).toFixed(1)}s`);
  console.log(
    "event:",
    draft.detectedEvent,
    "| confidence:",
    draft.confidence,
    "| lines:",
    draft.lines.length,
    "| exception:",
    draft.exceptionFlag,
  );
  console.log("sample line:", JSON.stringify(draft.lines[0] ?? null));
  await prisma.$disconnect();
})().catch((e) => {
  console.error("SMOKE FAIL:", e.message);
  process.exit(1);
});
