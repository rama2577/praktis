/**
 * Generate fixture dokumen untuk verifikasi E2E pipeline.
 * Jalankan: npx tsx scripts/generate-fixtures.ts
 */
import { mkdirSync } from "node:fs";
import { writeFileSync } from "node:fs";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

const FIXTURES = "tests/fixtures";
mkdirSync(FIXTURES, { recursive: true });

// ── PDF: invoice penjualan kredit + PPN ──────────────────────────────────
const doc = new PDFDocument({ size: "A4", margin: 50 });
const chunks: Buffer[] = [];
doc.on("data", (c) => chunks.push(c));
doc.on("end", () => {
  writeFileSync(`${FIXTURES}/invoice-penjualan.pdf`, Buffer.concat(chunks));
  console.log("✅ invoice-penjualan.pdf");
});
doc.fontSize(16).text("FAKTUR PENJUALAN KREDIT", { align: "center" });
doc.moveDown();
doc.fontSize(11).text("PT Maju Jaya");
doc.text("Jl. Sudirman No. 12, Jakarta");
doc.moveDown();
doc.text("Kepada Yth: CV Berkah Abadi");
doc.moveDown();
doc.text("No. Faktur: INV-2026-0812");
doc.text("Tanggal: 5 Agustus 2026");
doc.moveDown();
doc.text("Keterangan: Penjualan barang dagang secara kredit");
doc.moveDown();
doc.text("DPP: Rp 8.500.000");
doc.text("PPN 11%: Rp 935.000");
doc.text("Total: Rp 9.435.000");
doc.moveDown();
doc.text("Pembayaran: 30 hari setelah faktur (piutang usaha).");
doc.end();

// ── XLSX: rekening koran dengan penerimaan piutang ──────────────────────
(async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rekening Koran");
  ws.addRow(["Tanggal", "Keterangan", "Debet", "Kredit"]);
  ws.addRow(["2026-08-01", "Saldo awal", "", "10.000.000"]);
  ws.addRow(["2026-08-02", "Transfer masuk pelunasan piutang PT Sentosa", "", "2.500.000"]);
  ws.addRow(["2026-08-03", "Pembayaran utang usaha CV Berkah", "1.200.000", ""]);
  writeFileSync(`${FIXTURES}/rekening-koran.xlsx`, Buffer.from(await wb.xlsx.writeBuffer()));
  console.log("✅ rekening-koran.xlsx");
})();
