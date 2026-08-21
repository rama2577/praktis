import { describe, expect, it } from "vitest";
import {
  buildBalanceSheet,
  buildCashFlowStatement,
  buildEquityStatement,
  buildIncomeStatement,
  statementCsv,
} from "@/server/financial-statements";
import type { TrialBalanceRow } from "@/server/trial-balance";

const cls = (code: string): TrialBalanceRow["classification"] =>
  code.startsWith("1-") ? "ASET" : code.startsWith("2-") ? "LIABILITAS" : code.startsWith("3-") ? "EKUITAS" : code.startsWith("4-") ? "PENDAPATAN" : "BEBAN";

const row = (over: Partial<TrialBalanceRow>): TrialBalanceRow => ({
  accountCode: "4-1000",
  accountName: "Pendapatan",
  classification: cls(over.accountCode ?? "4-1000"),
  debit: 0,
  credit: 12_000_000,
  net: -12_000_000,
  balance: 12_000_000,
  normalBalance: "KREDIT",
  unusual: false,
  unusualReason: null,
  prevBalance: null,
  ...over,
});

const ROWS: TrialBalanceRow[] = [
  row({ accountCode: "4-1000", accountName: "Pendapatan Penjualan", balance: 20_000_000 }),
  row({ accountCode: "5-1100", accountName: "Beban Gaji", balance: 5_000_000 }),
  row({ accountCode: "1-1000", accountName: "Kas", balance: 33_000_000, debit: 35_000_000, credit: 2_000_000 }),
  row({ accountCode: "2-1100", accountName: "Utang Usaha", balance: 8_000_000 }),
  row({ accountCode: "3-1000", accountName: "Modal", balance: 10_000_000 }),
];

describe("financial-statements — laporan akhir (F6C)", () => {
  it("laba rugi: pendapatan − beban", () => {
    const s = buildIncomeStatement(ROWS, "PT Maju Jaya", "2026-08");
    expect(s.title).toBe("LAPORAN LABA RUGI");
    const laba = s.lines.find((l) => l.label.includes("LABA (RUGI)"));
    expect(laba?.amount).toBe(15_000_000);
  });

  it("neraca: aset = liabilitas + ekuitas", () => {
    const s = buildBalanceSheet(ROWS, "PT Maju Jaya", "2026-08", 15_000_000);
    const aset = s.lines.find((l) => l.label === "TOTAL ASET")?.amount ?? 0;
    const total = s.lines.find((l) => l.label === "TOTAL LIABILITAS & EKUITAS")?.amount ?? 0;
    expect(aset).toBe(33_000_000);
    expect(total).toBe(aset);
    expect(s.lines.some((l) => l.label === "Laba (rugi) periode berjalan")).toBe(true);
  });

  it("perubahan ekuitas: saldo awal + laba = saldo akhir", () => {
    const s = buildEquityStatement(ROWS, "PT Maju Jaya", "2026-08", 15_000_000);
    const akhir = s.lines.find((l) => l.label === "SALDO AKHIR EKUITAS")?.amount ?? 0;
    expect(akhir).toBe(25_000_000); // modal 10jt + laba 15jt
  });

  it("arus kas: masuk − keluar, saldo akhir", () => {
    const s = buildCashFlowStatement(ROWS, "PT Maju Jaya", "2026-08");
    const bersih = s.lines.find((l) => l.label === "KENAIKAN (PENURUNAN) KAS")?.amount ?? 0;
    const saldo = s.lines.find((l) => l.label === "SALDO KAS AKHIR PERIODE")?.amount ?? 0;
    expect(bersih).toBe(33_000_000);
    expect(saldo).toBe(33_000_000);
  });

  it("CSV memuat judul & angka", () => {
    const csv = statementCsv(buildIncomeStatement(ROWS, "PT Maju Jaya", "2026-08"));
    expect(csv).toContain("LAPORAN LABA RUGI");
    expect(csv).toContain("15000000.00");
  });
});
