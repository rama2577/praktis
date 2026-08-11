import { describe, expect, it } from "vitest";
import {
  buildTrialBalance,
  classifyAccount,
  parsePeriod,
  prevPeriodOf,
  trialBalanceCsv,
  trialBalanceXlsx,
  type EntryLike,
} from "@/server/trial-balance";

function entry(day: number, lines: Array<{ accountCode: string; accountName: string; debit: number; credit: number }>): EntryLike {
  return { entryDate: new Date(Date.UTC(2026, 7, day)), lines };
}

describe("parsePeriod & prevPeriodOf", () => {
  it("parse format YYYY-MM", () => {
    const r = parsePeriod("2026-08");
    expect(r?.start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(r?.end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("tolak format tidak valid", () => {
    expect(parsePeriod("2026-13")).toBeNull();
    expect(parsePeriod("2026-8")).toBeNull();
    expect(parsePeriod("abc")).toBeNull();
    expect(parsePeriod("2026-00")).toBeNull();
  });

  it("periode sebelumnya (termasuk lintas tahun)", () => {
    expect(prevPeriodOf("2026-08")).toBe("2026-07");
    expect(prevPeriodOf("2026-01")).toBe("2025-12");
  });
});

describe("classifyAccount", () => {
  it("klasifikasi standar COA Indonesia", () => {
    expect(classifyAccount("1-1100")).toBe("ASET");
    expect(classifyAccount("2-2100")).toBe("LIABILITAS");
    expect(classifyAccount("3-3100")).toBe("EKUITAS");
    expect(classifyAccount("4-4100")).toBe("PENDAPATAN");
    expect(classifyAccount("5-5100")).toBe("BEBAN");
    expect(classifyAccount("9-9000")).toBe("LAINNYA");
    expect(classifyAccount("abc")).toBe("LAINNYA");
  });
});

describe("buildTrialBalance — agregasi & saldo", () => {
  it("agregasi debit/kredit per akun + saldo sesuai normal", () => {
    const report = buildTrialBalance(
      [
        entry(1, [
          { accountCode: "1-1100", accountName: "Kas", debit: 10_000_000, credit: 0 },
          { accountCode: "4-4100", accountName: "Penjualan", debit: 0, credit: 10_000_000 },
        ]),
        entry(5, [
          { accountCode: "1-1100", accountName: "Kas", debit: 0, credit: 2_000_000 },
          { accountCode: "5-5100", accountName: "Beban Gaji", debit: 2_000_000, credit: 0 },
        ]),
      ],
      "2026-08",
    );

    expect(report.rows).toHaveLength(3);
    const kas = report.rows.find((r) => r.accountCode === "1-1100")!;
    expect(kas.debit).toBe(10_000_000);
    expect(kas.credit).toBe(2_000_000);
    expect(kas.net).toBe(8_000_000);
    expect(kas.balance).toBe(8_000_000); // aset: normal debit
    expect(kas.unusual).toBe(false);

    const penjualan = report.rows.find((r) => r.accountCode === "4-4100")!;
    expect(penjualan.balance).toBe(10_000_000); // pendapatan: normal kredit → -net
    expect(penjualan.unusual).toBe(false);
  });

  it("total debit = total kredit → seimbang; urut kode numerik", () => {
    const report = buildTrialBalance(
      [
        entry(1, [
          { accountCode: "5-5100", accountName: "Beban", debit: 500_000, credit: 0 },
          { accountCode: "1-1100", accountName: "Kas", debit: 0, credit: 500_000 },
        ]),
      ],
      "2026-08",
    );
    expect(report.balanced).toBe(true);
    expect(report.totalDebit).toBe(500_000);
    expect(report.totalCredit).toBe(500_000);
    expect(report.rows.map((r) => r.accountCode)).toEqual(["1-1100", "5-5100"]);
  });

  it("tidak seimbang saat debit ≠ kredit", () => {
    const report = buildTrialBalance(
      [entry(1, [{ accountCode: "1-1100", accountName: "Kas", debit: 100, credit: 0 }])],
      "2026-08",
    );
    expect(report.balanced).toBe(false);
  });
});

describe("buildTrialBalance — indikator kewajaran", () => {
  it("aset bersaldo kredit → tidak wajar", () => {
    const report = buildTrialBalance(
      [entry(1, [{ accountCode: "1-1100", accountName: "Kas", debit: 0, credit: 1_000 }])],
      "2026-08",
    );
    const kas = report.rows[0];
    expect(kas.unusual).toBe(true);
    expect(kas.unusualReason).toContain("Saldo kredit");
    expect(report.unusualCount).toBe(1);
  });

  it("piutang negatif → alasan khusus", () => {
    const report = buildTrialBalance(
      [entry(1, [{ accountCode: "1-1300", accountName: "Piutang Usaha", debit: 0, credit: 5_000 }])],
      "2026-08",
    );
    expect(report.rows[0].unusual).toBe(true);
    expect(report.rows[0].unusualReason).toContain("Piutang negatif");
  });

  it("liabilitas bersaldo debit → tidak wajar", () => {
    const report = buildTrialBalance(
      [entry(1, [{ accountCode: "2-2100", accountName: "Utang Usaha", debit: 3_000, credit: 0 }])],
      "2026-08",
    );
    expect(report.rows[0].unusual).toBe(true);
    expect(report.rows[0].unusualReason).toContain("Saldo debit");
  });

  it("pendapatan bersaldo kredit → wajar", () => {
    const report = buildTrialBalance(
      [entry(1, [{ accountCode: "4-4100", accountName: "Penjualan", debit: 0, credit: 9_000 }])],
      "2026-08",
    );
    expect(report.rows[0].unusual).toBe(false);
  });

  it("akun tanpa klasifikasi (LAINNYA) tidak dianggap tidak wajar", () => {
    const report = buildTrialBalance(
      [entry(1, [{ accountCode: "9-9000", accountName: "Kontra", debit: 7_000, credit: 0 }])],
      "2026-08",
    );
    expect(report.rows[0].unusual).toBe(false);
  });
});

describe("komparatif bulan lalu", () => {
  it("saldo bulan lalu dihitung dari entri periode sebelumnya", () => {
    const entries = [
      entry(1, [{ accountCode: "1-1100", accountName: "Kas", debit: 10_000, credit: 0 }]),
    ];
    const prevEntries = [
      { entryDate: new Date(Date.UTC(2026, 6, 15)), lines: [{ accountCode: "1-1100", accountName: "Kas", debit: 4_000, credit: 1_000 }] },
    ];
    const report = buildTrialBalance(entries, "2026-08", prevEntries, "2026-07");
    expect(report.prevPeriod).toBe("2026-07");
    expect(report.rows[0].prevBalance).toBe(3_000);
  });

  it("tanpa data bulan lalu → prevBalance null", () => {
    const report = buildTrialBalance(
      [entry(1, [{ accountCode: "1-1100", accountName: "Kas", debit: 100, credit: 0 }])],
      "2026-08",
    );
    expect(report.rows[0].prevBalance).toBeNull();
  });
});

describe("ekspor", () => {
  const report = buildTrialBalance(
    [
      entry(1, [
        { accountCode: "1-1100", accountName: "Kas", debit: 10_000, credit: 0 },
        { accountCode: "4-4100", accountName: "Penjualan", debit: 0, credit: 10_000 },
      ]),
    ],
    "2026-08",
  );

  it("CSV punya header, baris akun, dan total", () => {
    const csv = trialBalanceCsv(report);
    expect(csv).toContain("Kode Akun");
    expect(csv).toContain("Kas");
    expect(csv).toContain("Total Debit,10000.00");
    expect(csv).toContain("Total Kredit,10000.00");
  });

  it("XLSX menghasilkan buffer non-kosong", () => {
    const buf = trialBalanceXlsx(report);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });
});
