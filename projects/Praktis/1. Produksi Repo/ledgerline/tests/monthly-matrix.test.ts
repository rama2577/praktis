import { describe, expect, it } from "vitest";
import { buildIncomeStatement, buildBalanceSheet } from "@/server/financial-statements";
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

describe("monthly matrix building blocks", () => {
  it("Laba Rugi per bulan: pendapatan − beban = laba", () => {
    const rows = [row("4-101-001", "Pendapatan Usaha", 20_000_000), row("5-101-001", "Beban Gaji", 8_000_000)];
    const stmt = buildIncomeStatement(rows, "Klien", "2026-03");
    const laba = stmt.lines.find((l) => l.label === "LABA (RUGI) PERIODE BERJALAN")!.amount;
    const pend = stmt.lines.find((l) => l.label === "TOTAL PENDAPATAN")!.amount;
    const beban = stmt.lines.find((l) => l.label === "TOTAL BEBAN")!.amount;
    expect(pend).toBe(20_000_000);
    expect(beban).toBe(8_000_000);
    expect(laba).toBe(12_000_000);
  });

  it("Neraca kumulatif: aset = liabilitas + ekuitas + laba YTD", () => {
    const rows = [
      row("1-101-001", "Kas", 50_000_000),
      row("2-101-001", "Hutang", 20_000_000),
      row("3-101-001", "Modal", 18_000_000),
    ];
    const stmt = buildBalanceSheet(rows, "Klien", "2026-06", 12_000_000); // laba YTD
    const aset = stmt.lines.find((l) => l.label === "TOTAL ASET")!.amount;
    const liab = stmt.lines.find((l) => l.label === "TOTAL LIABILITAS")!.amount;
    const ekuitas = stmt.lines.find((l) => l.label === "TOTAL EKUITAS")!.amount;
    expect(aset).toBe(50_000_000);
    expect(ekuitas).toBe(18_000_000 + 12_000_000);
    expect(aset).toBe(liab + ekuitas); // balance
  });

  it("kolom Total matrix = Σ 12 bulan", () => {
    // Simulasi 12 bulan pendapatan 1 jt/bulan
    let pend = 0;
    for (let m = 1; m <= 12; m++) {
      const stmt = buildIncomeStatement([row("4-101-001", "Pendapatan Usaha", 1_000_000)], "K", `2026-${String(m).padStart(2, "0")}`);
      pend += stmt.lines.find((l) => l.label === "TOTAL PENDAPATAN")!.amount;
    }
    expect(pend).toBe(12_000_000);
  });
});
