import { describe, expect, it } from "vitest";
import { bucketAging } from "@/server/subledger";

describe("subledger aging logic (bucketAging)", () => {
  const asOf = new Date("2026-08-13T00:00:00Z");

  it("transaksi 10 hari lalu masuk bucket current", () => {
    const r = bucketAging([{ date: "2026-08-03", debit: 5_000_000, credit: 0 }], asOf);
    expect(r.CURRENT).toBe(5_000_000);
    expect(r["31-60"]).toBe(0);
  });

  it("transaksi 45 hari lalu masuk 31-60", () => {
    const r = bucketAging([{ date: "2026-06-29", debit: 2_000_000, credit: 0 }], asOf);
    expect(r["31-60"]).toBe(2_000_000);
  });

  it("transaksi 100 hari lalu masuk 90+", () => {
    const r = bucketAging([{ date: "2026-05-01", debit: 3_000_000, credit: 0 }], asOf);
    expect(r["90+"]).toBe(3_000_000);
  });

  it("pembayaran (kredit) mengurangi bucket transaksi aslinya", () => {
    const r = bucketAging(
      [
        { date: "2026-04-01", debit: 10_000_000, credit: 0 }, // > 90 hari
        { date: "2026-08-10", debit: 0, credit: 4_000_000 }, // pelunasan (current)
      ],
      asOf,
    );
    expect(r["90+"]).toBe(10_000_000);
    expect(r.CURRENT).toBe(-4_000_000);
  });

  it("saldo bersih: total semua bucket = Σ debit − kredit", () => {
    const r = bucketAging(
      [
        { date: "2026-01-15", debit: 7_000_000, credit: 0 },
        { date: "2026-07-20", debit: 3_000_000, credit: 0 },
        { date: "2026-08-01", debit: 0, credit: 2_000_000 },
      ],
      asOf,
    );
    const total = r.CURRENT + r["31-60"] + r["61-90"] + r["90+"];
    expect(total).toBe(8_000_000);
  });
});
