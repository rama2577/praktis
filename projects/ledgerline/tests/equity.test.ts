import { describe, expect, it } from "vitest";
import { buildEquityStatement, isLabaBerjalan } from "@/server/financial-statements";
import type { TrialBalanceRow } from "@/server/trial-balance";

function eqRow(code: string, name: string, balance: number): TrialBalanceRow {
  return {
    accountCode: code,
    accountName: name,
    classification: "EKUITAS",
    debit: balance > 0 ? balance : 0,
    credit: balance < 0 ? -balance : 0,
    net: balance,
    balance,
    normalBalance: "KREDIT",
    unusual: false,
    unusualReason: null,
    prevBalance: null,
  };
}

const find = (lines: { label: string; amount: number }[], label: string) => lines.find((l) => l.label.includes(label))?.amount;

describe("EQ v2 — Laporan Perubahan Ekuitas", () => {
  it("akun Laba Berjalan (3301/3300) tidak masuk saldo awal", () => {
    expect(isLabaBerjalan({ accountCode: "3301", accountName: "Laba Berjalan" })).toBe(true);
    expect(isLabaBerjalan({ accountCode: "3300", accountName: "Laba Berjalan" })).toBe(true);
    expect(isLabaBerjalan({ accountCode: "3-301-001", accountName: "Laba Berjalan" })).toBe(true);
    expect(isLabaBerjalan({ accountCode: "3100", accountName: "Modal Disetor" })).toBe(false);
    expect(isLabaBerjalan({ accountCode: "3200", accountName: "Laba Ditahan" })).toBe(false);
  });

  it("saldo awal = ekuitas tanpa laba berjalan; akhir = awal + laba (tidak dobel)", () => {
    const rows = [
      eqRow("3100", "Modal Disetor", 100_000_000),
      eqRow("3200", "Laba Ditahan", 20_000_000),
      eqRow("3301", "Laba Berjalan", 0), // laba belum ditutup — tidak boleh dobel
    ];
    const stmt = buildEquityStatement(rows, "PT X", "2026-08", 30_000_000);
    expect(find(stmt.lines, "SALDO AWAL EKUITAS")).toBe(120_000_000);
    expect(find(stmt.lines, "LABA (RUGI) PERIODE BERJALAN")).toBe(30_000_000);
    expect(find(stmt.lines, "SALDO AKHIR EKUITAS")).toBe(150_000_000);
  });

  it("setoran modal & prive masuk perhitungan", () => {
    const rows = [eqRow("3100", "Modal Disetor", 100_000_000)];
    const stmt = buildEquityStatement(rows, "PT X", "2026-08", 10_000_000, { setoranModal: 50_000_000, prive: 5_000_000 });
    expect(find(stmt.lines, "SETORAN MODAL")).toBe(50_000_000);
    expect(find(stmt.lines, "PRIVE / DIVIDEN")).toBe(-5_000_000);
    expect(find(stmt.lines, "SALDO AKHIR EKUITAS")).toBe(155_000_000);
  });

  it("saldo akhir cocok dengan neraca (ekuitas + laba berjalan)", () => {
    const rows = [
      eqRow("3100", "Modal Disetor", 100_000_000),
      eqRow("3301", "Laba Berjalan", 30_000_000), // neraca: ekuitas 130 jt
    ];
    const stmt = buildEquityStatement(rows, "PT X", "2026-08", 30_000_000);
    expect(find(stmt.lines, "SALDO AKHIR EKUITAS")).toBe(130_000_000);
    expect(stmt.lines.some((l) => l.label.includes("CATATAN"))).toBe(false);
  });

  it("kompatibel tanpa activity (default 0)", () => {
    const rows = [eqRow("3100", "Modal Disetor", 50_000_000)];
    const stmt = buildEquityStatement(rows, "PT X", "2026-08", 5_000_000);
    expect(find(stmt.lines, "SALDO AKHIR EKUITAS")).toBe(55_000_000);
  });
});
