import { describe, expect, it } from "vitest";
import { buildWorksheet, worksheetCsv } from "@/server/worksheet";
import { buildAnalysis } from "@/server/financial-analysis";
import { buildCalk, calkMarkdown } from "@/server/calk";
import { buildTaxAnalysis } from "@/server/tax-analysis";
import type { TrialBalanceRow } from "@/server/trial-balance";
import type { TaxLine } from "@/server/tax";

const cls = (code: string): TrialBalanceRow["classification"] =>
  code.startsWith("1-") ? "ASET" : code.startsWith("2-") ? "LIABILITAS" : code.startsWith("3-") ? "EKUITAS" : code.startsWith("4-") ? "PENDAPATAN" : "BEBAN";

const row = (over: Partial<TrialBalanceRow>): TrialBalanceRow => ({
  accountCode: "4-1000",
  accountName: "Pendapatan",
  classification: cls(over.accountCode ?? "4-1000"),
  debit: 0,
  credit: 0,
  net: 0,
  balance: 0,
  normalBalance: null,
  unusual: false,
  unusualReason: null,
  prevBalance: null,
  ...over,
});

const ROWS: TrialBalanceRow[] = [
  row({ accountCode: "1-1000", accountName: "Kas", balance: 33_000_000, debit: 35_000_000, credit: 2_000_000 }),
  row({ accountCode: "2-1100", accountName: "Utang Usaha", balance: 8_000_000 }),
  row({ accountCode: "3-1000", accountName: "Modal", balance: 10_000_000 }),
  row({ accountCode: "4-1000", accountName: "Pendapatan Penjualan", balance: 20_000_000, credit: 20_000_000 }),
  row({ accountCode: "5-1100", accountName: "Beban Gaji", balance: 5_000_000, debit: 5_000_000 }),
];

const TAX_LINES: TaxLine[] = [
  {
    lineId: "l1",
    journalId: "j1",
    journalDescription: "Faktur penjualan",
    entryDate: "2026-08-10",
    accountCode: "2-2000",
    accountName: "PPN Keluaran",
    debit: 0,
    credit: 223_850,
    notes: null,
    taxCode: "PPN-OUT-01",
    taxBase: 2_035_000,
  },
  {
    lineId: "l2",
    journalId: "j2",
    journalDescription: "Bukti potong",
    entryDate: "2026-08-12",
    accountCode: "2-2300",
    accountName: "Utang PPh 23",
    debit: 0,
    credit: 200_000,
    notes: null,
    taxCode: "PPH23",
    taxBase: 10_000_000,
  },
];

describe("worksheet — neraca lajur", () => {
  it("pasangan kolom seimbang + laba bersih dipindah", () => {
    const w = buildWorksheet(ROWS, "PT Maju Jaya", "2026-08");
    expect(w.balanced).toBe(true);
    // pendapatan 20jt − beban 5jt = laba 15jt
    expect(w.labaBersih).toBe(15_000_000);
    expect(w.totals.lrDebit).toBe(w.totals.lrCredit);
    expect(w.totals.neracaDebit).toBe(w.totals.neracaCredit);
    const labaLine = w.lines.find((l) => l.accountName.includes("LABA"));
    expect(labaLine?.neracaCredit).toBe(15_000_000);
  });

  it("CSV memiliki 10 kolom + baris TOTAL", () => {
    const csv = worksheetCsv(buildWorksheet(ROWS, "PT Maju Jaya", "2026-08"));
    expect(csv.split("\n")[0].split(",")).toHaveLength(10);
    expect(csv).toContain("TOTAL");
  });
});

describe("financial-analysis — rasio & narasi", () => {
  it("rasio kunci terhitung benar", () => {
    const a = buildAnalysis(ROWS, "PT Maju Jaya", "2026-08");
    const cr = a.ratios.find((r) => r.key === "current-ratio");
    const npm = a.ratios.find((r) => r.key === "npm");
    // aset lancar 33jt / liab jangka pendek 8jt
    expect(cr?.value).toBeCloseTo(4.125);
    expect(npm?.value).toBeCloseTo(0.75);
    expect(a.narrative.length).toBeGreaterThan(2);
    expect(a.charts.pendapatanVsBeban.pendapatan).toBe(20_000_000);
  });
});

describe("calk — catatan atas laporan keuangan", () => {
  it("5 bagian + markdown", () => {
    const c = buildCalk({ clientName: "PT Maju Jaya", period: "2026-08", rows: ROWS, profile: null });
    expect(c.sections).toHaveLength(5);
    expect(c.sections[2].items?.length).toBeGreaterThan(0);
    const md = calkMarkdown(c);
    expect(md).toContain("CATATAN ATAS LAPORAN KEUANGAN");
    expect(md).toContain("SAK ETAP");
  });
});

describe("tax-analysis — tax ratio", () => {
  it("tax ratio & rincian PPN/PPh", () => {
    const t = buildTaxAnalysis("PT Maju Jaya", "2026-08", TAX_LINES, ROWS);
    expect(t.ppn.pk).toBe(223_850);
    expect(t.ppn.pm).toBe(0);
    expect(t.pph.pph23).toBe(200_000);
    expect(t.taxRatio.value).not.toBeNull();
    expect(t.narrative.length).toBeGreaterThan(2);
  });
});
