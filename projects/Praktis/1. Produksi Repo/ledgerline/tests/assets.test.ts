import { describe, expect, it } from "vitest";
import {
  assetReconciliationCsv,
  computeDepreciation,
  depreciationJournalLines,
  fiscalGroupLabel,
  fiscalGroupMonths,
  monthsElapsed,
  parsePeriod,
} from "@/server/assets";

const base = {
  purchaseCost: 120_000_000,
  residualValue: 0,
  method: "STRAIGHT_LINE" as const,
  commercialLifeMonths: 48,
  fiscalGroup: "K1",
  purchaseDate: new Date("2026-01-15"),
};

describe("assets — periode & kelompok fiskal (F5A)", () => {
  it("parse period valid/invalid", () => {
    expect(parsePeriod("2026-08")).toEqual({ year: 2026, month: 8 });
    expect(parsePeriod("2026-13")).toBeNull();
    expect(parsePeriod("2026-8")).toBeNull();
    expect(parsePeriod("abc")).toBeNull();
  });

  it("kelompok Pasal 11: 4/8/16/20 tahun + bangunan", () => {
    expect(fiscalGroupMonths("K1")).toBe(48);
    expect(fiscalGroupMonths("K2")).toBe(96);
    expect(fiscalGroupMonths("K3")).toBe(192);
    expect(fiscalGroupMonths("K4")).toBe(240);
    expect(fiscalGroupMonths("BP")).toBe(240);
    expect(fiscalGroupMonths("BNP")).toBe(120);
    expect(fiscalGroupMonths("XXX")).toBe(0);
    expect(fiscalGroupLabel("K2")).toContain("8 tahun");
  });

  it("monthsElapsed inklusif sejak bulan perolehan", () => {
    expect(monthsElapsed(new Date("2026-01-15"), "2026-01")).toBe(1);
    expect(monthsElapsed(new Date("2026-01-15"), "2026-08")).toBe(8);
    expect(monthsElapsed(new Date("2026-01-15"), "2025-12")).toBe(0);
    expect(monthsElapsed(new Date("2025-12-01"), "2026-01")).toBe(2); // lintas tahun
  });
});

describe("assets — penyusutan komersial & fiskal", () => {
  it("garis lurus 4 tahun: 120jt/48 = 2,5jt per bulan", () => {
    const r = computeDepreciation({ ...base, period: "2026-01" });
    expect(r.commercialAmount).toBe(2_500_000);
    expect(r.fiscalAmount).toBe(2_500_000);
    expect(r.accumulatedCommercial).toBe(2_500_000);
    expect(r.bookValueCommercial).toBe(117_500_000);
  });

  it("akumulasi berjalan lintas bulan (prev)", () => {
    const r = computeDepreciation({ ...base, period: "2026-08", prevCommercial: 7_500_000, prevFiscal: 7_500_000 });
    expect(r.commercialAmount).toBe(2_500_000);
    expect(r.accumulatedCommercial).toBe(10_000_000);
    expect(r.bookValueCommercial).toBe(110_000_000);
  });

  it("berhenti setelah umur komersial habis", () => {
    const r = computeDepreciation({ ...base, period: "2030-02", prevCommercial: 120_000_000 });
    expect(r.commercialAmount).toBe(0);
    expect(r.accumulatedCommercial).toBe(120_000_000);
    expect(r.fullyDepreciated).toBe(true);
  });

  it("fiskal tanpa nilai sisa — beda temporer muncul", () => {
    const r = computeDepreciation({
      purchaseCost: 100_000_000,
      residualValue: 20_000_000,
      method: "STRAIGHT_LINE",
      commercialLifeMonths: 60,
      fiscalGroup: "K2", // 96 bulan fiskal
      purchaseDate: new Date("2026-01-01"),
      period: "2026-01",
    });
    expect(r.commercialAmount).toBe(1_333_333.33);
    expect(r.fiscalAmount).toBe(1_041_666.67);
    expect(r.bookValueCommercial).toBe(98_666_666.67);
    expect(r.bookValueFiscal).toBe(98_958_333.33);
  });

  it("saldo menurun (double declining) lebih besar di awal", () => {
    const db = computeDepreciation({
      ...base,
      method: "DECLINING_BALANCE",
      period: "2026-01",
    });
    const sl = computeDepreciation({ ...base, period: "2026-01" });
    expect(db.commercialAmount).toBeGreaterThan(sl.commercialAmount);
    expect(db.commercialAmount).toBe(5_000_000); // 120jt × (2/4)/12
  });

  it("saldo menurun dibatasi nilai sisa", () => {
    const r = computeDepreciation({
      purchaseCost: 100_000_000,
      residualValue: 90_000_000,
      method: "DECLINING_BALANCE",
      commercialLifeMonths: 24,
      fiscalGroup: "K1",
      purchaseDate: new Date("2026-01-01"),
      period: "2026-01",
      prevCommercial: 9_000_000,
    });
    expect(r.commercialAmount).toBe(1_000_000); // sisa 10jt - 9jt = 1jt
    expect(r.accumulatedCommercial).toBe(10_000_000);
  });

  it("baris jurnal selalu balance (debit = kredit)", () => {
    const lines = depreciationJournalLines({ name: "Mobil Operasional" }, 2_500_000);
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);
    expect(lines[0].accountCode).toBe("5-1500");
    expect(lines[1].accountCode).toBe("1-1500");
    expect(lines[0].accountName).toContain("Mobil Operasional");
  });
});

describe("assets — laporan rekonsiliasi", () => {
  it("CSV menyertakan header & baris dengan nilai buku", () => {
    const csv = assetReconciliationCsv({
      period: "2026-01",
      rows: [
        {
          assetId: "a1",
          name: "Mobil Operasional",
          category: "Kendaraan",
          purchaseDate: "2026-01-15T00:00:00.000Z",
          purchaseCost: 120_000_000,
          fiscalGroup: "K1",
          fiscalGroupLabel: "Kelompok 1 (4 tahun)",
          period: "2026-01",
          accumulatedCommercial: 2_500_000,
          accumulatedFiscal: 2_500_000,
          bookValueCommercial: 117_500_000,
          bookValueFiscal: 117_500_000,
          temporaryDifference: 0,
        },
      ],
      totals: { purchaseCost: 120_000_000, bookValueCommercial: 117_500_000, bookValueFiscal: 117_500_000, temporaryDifference: 0 },
    });
    expect(csv).toContain("Aset,Kategori");
    expect(csv).toContain("Mobil Operasional");
    expect(csv).toContain("Beda Temporer");
  });
});
