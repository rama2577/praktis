import { describe, expect, it } from "vitest";
import { applyRounding, roundAmount, roundTo } from "@/lib/rounding";
import { buildIncomeStatement, buildBalanceSheet, buildEquityStatement } from "@/server/financial-statements";
import type { TrialBalanceRow } from "@/server/trial-balance";

function row(code: string, name: string, balance: number): TrialBalanceRow {
  const cls = code.startsWith("1") ? "ASET" : code.startsWith("2") ? "LIABILITAS" : code.startsWith("3") ? "EKUITAS" : code.startsWith("4") ? "PENDAPATAN" : "BEBAN";
  const nb = cls === "ASET" || cls === "BEBAN" ? "DEBIT" : "KREDIT";
  return {
    accountCode: code,
    accountName: name,
    classification: cls,
    debit: nb === "DEBIT" ? balance : 0,
    credit: nb === "KREDIT" ? balance : 0,
    net: nb === "DEBIT" ? balance : -balance,
    balance,
    normalBalance: nb,
    unusual: false,
    unusualReason: null,
    prevBalance: null,
  };
}

describe("rounding engine — primitives", () => {
  it("roundTo: half-up ke kelipatan precision", () => {
    expect(roundTo(1_234_500, 1_000)).toBe(1_235_000);
    expect(roundTo(1_234_499, 1_000)).toBe(1_234_000);
    expect(roundTo(5, 1)).toBe(5);
  });
  it("roundAmount: ÷ divisor", () => {
    expect(roundAmount(1_234_567, 1_000)).toBe(1_235); // ribuan
    expect(roundAmount(1_234_567, 1_000_000)).toBe(1); // jutaan
  });
});

describe("rounding engine — laporan konsisten", () => {
  it("Laba Rugi ribu: TOTAL = Σ baris rounded; LABA = PENDAPATAN − BEBAN", () => {
    const rows = [
      row("4-101-001", "Pendapatan Jasa", 10_000_400),
      row("4-102-001", "Pendapatan Lain", 5_000_600),
      row("5-101-001", "Beban Gaji", 8_000_500),
      row("5-102-001", "Beban Sewa", 2_000_300),
    ];
    const stmt = buildIncomeStatement(rows, "PT X", "2026-08");
    const rounded = applyRounding(stmt.lines, "ribu");
    const g = (l: string) => rounded.find((x) => x.label.includes(l))?.amount ?? 0;
    expect(g("TOTAL PENDAPATAN")).toBe(10_000 + 5_001); // 10.000.400→10.000; 5.000.600→5.001
    expect(g("TOTAL BEBAN")).toBe(8_001 + 2_000); // 8.000.500→8.001; 2.000.300→2.000
    expect(g("LABA (RUGI)")).toBe(15_001 - 10_001); // konsisten, bukan bulatkan laba asli
  });

  it("Neraca juta: A = L + E setelah rounding (tidak selisih)", () => {
    const rows = [
      row("1-101-001", "Kas", 120_400_000),
      row("1-102-001", "Piutang", 30_600_000),
      row("2-101-001", "Hutang", 40_500_000),
      row("3-101-001", "Modal", 60_100_000),
    ];
    const laba = 50_400_000;
    const stmt = buildBalanceSheet(rows, "PT X", "2026-08", laba);
    const rounded = applyRounding(stmt.lines, "juta");
    const g = (l: string) => rounded.find((x) => x.label.includes(l))?.amount ?? 0;
    const aset = g("TOTAL ASET");
    const liab = g("TOTAL LIABILITAS");
    const ekuitas = g("TOTAL EKUITAS");
    expect(aset).toBe(120 + 31); // 120.4→120; 30.6→31
    expect(liab).toBe(41); // 40.5→41 (half-up)
    expect(ekuitas).toBe(60 + 50); // modal 60.1→60 + laba 50.4→50
    expect(aset).toBe(liab + ekuitas); // 151 = 41 + 110 ✓
  });

  it("Perubahan Ekuitas ribu: SALDO AKHIR = AWAL + LABA (rounded)", () => {
    const rows = [row("3100", "Modal Disetor", 100_000_400)];
    const stmt = buildEquityStatement(rows, "PT X", "2026-08", 50_000_600);
    const rounded = applyRounding(stmt.lines, "ribu");
    const g = (l: string) => rounded.find((x) => x.label.includes(l))?.amount ?? 0;
    expect(g("SALDO AWAL EKUITAS")).toBe(100_000);
    expect(g("LABA (RUGI) PERIODE BERJALAN")).toBe(50_001);
    expect(g("SALDO AKHIR EKUITAS")).toBe(150_001);
  });

  it("mode none: hanya membulatkan ke rupiah penuh, struktur utuh", () => {
    const rows = [row("4-101-001", "Pendapatan", 10_000_000)];
    const stmt = buildIncomeStatement(rows, "PT X", "2026-08");
    const rounded = applyRounding(stmt.lines, "none");
    expect(rounded.length).toBe(stmt.lines.length);
    expect(rounded.find((l) => l.label.includes("TOTAL PENDAPATAN"))?.amount).toBe(10_000_000);
  });
});
