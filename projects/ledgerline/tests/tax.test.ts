import { describe, expect, it } from "vitest";
import {
  buildEBupotCsv,
  buildPPh21Csv,
  buildPPh42Csv,
  buildSpt1111Csv,
  buildSpt1771,
  classifyTaxLines,
  inferTaxCode,
  TAX_CODE_CATALOG,
  TAX_CODE_OPTIONS,
  taxBaseOf,
  type TaxLine,
} from "@/server/tax";

const baseLine = (over: Partial<TaxLine>): TaxLine => ({
  lineId: "l1",
  journalId: "j1",
  journalDescription: "Penjualan dengan PPN",
  entryDate: "2026-08-10T00:00:00.000Z",
  accountCode: "2-2000",
  accountName: "PPN Keluaran",
  debit: 0,
  credit: 550_000,
  notes: "PPN 11%",
  taxCode: null,
  taxBase: null,
  ...over,
});

describe("tax — katalog & inferensi (F5B)", () => {
  it("katalog lengkap & berlabel Indonesia", () => {
    expect(TAX_CODE_OPTIONS.length).toBeGreaterThanOrEqual(15);
    for (const entry of TAX_CODE_OPTIONS) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(TAX_CODE_CATALOG[entry.code]).toBe(entry);
    }
  });

  it("infer kode pajak dari akun standar", () => {
    expect(inferTaxCode("2-2000")).toBe("PPN-OUT-01");
    expect(inferTaxCode("1-1400")).toBe("PPN-IN-01");
    expect(inferTaxCode("1-1400", "PPN tidak dapat dikreditkan")).toBe("PPN-IN-03");
    expect(inferTaxCode("2-2300")).toBe("PPH23-104");
    expect(inferTaxCode("2-2400")).toBe("PPH42-401");
    expect(inferTaxCode("2-2100")).toBe("PPH21-21-100-01");
    expect(inferTaxCode("1-1000")).toBeNull();
  });

  it("DPP mengikuti arah akun (kredit untuk terutang, debit untuk masukan)", () => {
    expect(taxBaseOf(baseLine({ debit: 0, credit: 550_000 }))).toBe(550_000);
    expect(taxBaseOf(baseLine({ accountCode: "1-1400", debit: 550_000, credit: 0 }))).toBe(550_000);
  });
});

describe("tax — klasifikasi & ringkasan", () => {
  it("mengelompokkan PPN keluaran & masukan (B2/B3)", () => {
    const summary = classifyTaxLines(
      [
        baseLine({ lineId: "a", credit: 550_000 }),
        baseLine({ lineId: "b", accountCode: "1-1400", debit: 550_000, credit: 0 }),
        baseLine({ lineId: "c", accountCode: "1-1400", debit: 100_000, credit: 0, notes: "PPN tidak dapat dikreditkan" }),
      ],
      "2026-08",
    );
    expect(summary.ppnOut.ppn).toBe(60_500); // 550.000 × 11%
    expect(summary.ppnIn.ppn).toBe(60_500);
    expect(summary.ppnInNonCreditable.ppn).toBe(11_000);
  });

  it("menghitung PPh 23 & 4(2) dari DPP", () => {
    const summary = classifyTaxLines(
      [
        baseLine({ lineId: "a", accountCode: "2-2300", credit: 200_000, notes: "Jasa konsultan" }),
        baseLine({ lineId: "b", accountCode: "2-2400", credit: 1_000_000, notes: "Sewa gedung" }),
      ],
      "2026-08",
    );
    expect(summary.pph23.ppn).toBe(4_000); // 200.000 × 2%
    expect(summary.pph42.ppn).toBe(100_000); // 1.000.000 × 10%
  });

  it("override taxCode menang atas inferensi", () => {
    const summary = classifyTaxLines(
      [baseLine({ lineId: "a", credit: 550_000, taxCode: "PPN-OUT-02", taxBase: 5_000_000 })],
      "2026-08",
    );
    expect(summary.ppnOut.ppn).toBe(550_000); // 5.000.000 × 11% dari taxBase
  });
});

describe("tax — generator SPT", () => {
  const summary = classifyTaxLines(
    [
      baseLine({ lineId: "a", credit: 550_000 }),
      baseLine({ lineId: "b", accountCode: "1-1400", debit: 550_000, credit: 0 }),
      baseLine({ lineId: "c", accountCode: "2-2300", credit: 200_000, notes: "Jasa konsultan" }),
      baseLine({ lineId: "d", accountCode: "2-2400", credit: 1_000_000, notes: "Sewa gedung" }),
    ],
    "2026-08",
  );

  it("SPT 1111 memuat lampiran B1/B2/B3 + ringkasan", () => {
    const csv = buildSpt1111Csv(summary, "PT Maju Jaya");
    expect(csv).toContain("Lampiran");
    expect(csv).toContain("B1");
    expect(csv).toContain("B2");
    expect(csv).toContain("Total PK (B1)");
    expect(csv).toContain("550000.00");
  });

  it("e-Bupot 23 memuat KAP/KJS & tarif", () => {
    const csv = buildEBupotCsv(summary, "2026-08");
    expect(csv).toContain("104"); // kode objek pajak jasa
    expect(csv).toContain("0.02");
    expect(csv).toContain("TOTAL PPh 23: 4000.00");
  });

  it("PPh 4(2) memuat kode & tarif", () => {
    const csv = buildPPh42Csv(summary, "2026-08");
    expect(csv).toContain("401");
    expect(csv).toContain("0.10");
  });

  it("PPh 21 masa memuat baris", () => {
    const s21 = classifyTaxLines([baseLine({ lineId: "a", accountCode: "2-2100", credit: 500_000 })], "2026-08");
    const csv = buildPPh21Csv(s21, "2026-08");
    expect(csv).toContain("PPh 21");
    expect(csv).toContain("500000.00");
  });

  it("SPT 1771: laba komersial → koreksi fiskal aset → laba fiskal → PPh 22%", () => {
    const tb = [
      { accountCode: "4-1000", accountName: "Pendapatan Penjualan", classification: "PENDAPATAN" as const, balance: 10_000_000 },
      { accountCode: "5-1500", accountName: "Beban Penyusutan", classification: "BEBAN" as const, balance: 3_125_000 },
      { accountCode: "5-1000", accountName: "Beban Gaji", classification: "BEBAN" as const, balance: 2_000_000 },
    ];
    const { csv, result } = buildSpt1771("PT Maju Jaya", "2026-08", tb, { assetCorrection: -208_333 });
    expect(result.labaKomersial).toBe(4_875_000);
    expect(result.koreksiTotal).toBe(-208_333);
    expect(result.labaFiskal).toBe(4_666_667);
    expect(result.pphTerutang).toBe(1_026_666.74); // 4.666.667 × 22%
    expect(csv).toContain("Koreksi fiskal: Beda temporer penyusutan (Pasal 11)");
    expect(csv).toContain("PPh BADAN TERUTANG (22%)");
  });

  it("SPT 1771 tanpa pendapatan → PPh 0", () => {
    const { result } = buildSpt1771("X", "2026-08", [
      { accountCode: "5-1000", accountName: "Beban", classification: "BEBAN" as const, balance: 1_000_000 },
    ]);
    expect(result.labaKomersial).toBe(-1_000_000);
    expect(result.pphTerutang).toBe(0);
  });
});
