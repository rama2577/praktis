import { describe, it, expect } from "vitest";
import { renderPdf, xlsxBuffer } from "@/server/export";

describe("ekspor laporan (PDF + XLSX)", () => {
  it("renderPdf menghasilkan dokumen PDF valid", async () => {
    const buf = await renderPdf({
      title: "Neraca Percobaan — PT Contoh",
      subtitle: "Periode 2026-08",
      tables: [
        {
          title: "Rekening",
          columns: [
            { header: "Kode", ratio: 1.1 },
            { header: "Akun", ratio: 2.6 },
            { header: "Debit", align: "right", ratio: 1.4 },
            { header: "Kredit", align: "right", ratio: 1.4 },
          ],
          rows: [
            ["1-1100", "Kas dan Setara Kas", 1000000, 0],
            ["2-1100", "Utang Usaha", 0, 250000],
          ],
          footer: ["Total Debit: 1.000.000   ·   Total Kredit: 250.000"],
        },
      ],
    });
    expect(buf.length).toBeGreaterThan(200);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renderPdf menangani tabel kosong tanpa error", async () => {
    const buf = await renderPdf({
      title: "Laporan Kosong",
      tables: [{ columns: [{ header: "A" }, { header: "B" }], rows: [] }],
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renderPdf membersihkan karakter non-Latin1 (emoji)", async () => {
    const buf = await renderPdf({
      title: "Judul",
      tables: [{ columns: [{ header: "Akun" }], rows: [["Kas 💰 dan setara"], ["Pendapatan → OK"]] }],
    });
    // Tidak boleh ada karakter emoji (4 byte UTF-8) yang tersisa sebagai garbage di PDF.
    const out = buf.toString("latin1");
    expect(out).not.toContain("💰");
  });

  it("xlsxBuffer menghasilkan workbook XLSX valid (zip)", async () => {
    const buf = await xlsxBuffer([
      {
        name: "Lampiran I",
        columns: [
          { header: "Kode", key: "kode", width: 10 },
          { header: "Jumlah", key: "jumlah", width: 18 },
        ],
        rows: [
          { kode: "1-1100", jumlah: 1000000 },
          { kode: "2-1100", jumlah: 250000 },
        ],
      },
    ]);
    expect(buf.length).toBeGreaterThan(500);
    // Magic bytes ZIP (PK\x03\x04)
    expect(buf.subarray(0, 4).toString("latin1")).toBe("PK\u0003\u0004");
  });
});
