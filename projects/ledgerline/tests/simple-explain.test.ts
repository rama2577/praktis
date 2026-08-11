import { describe, expect, it } from "vitest";
import { classify, explainJournal, summarizeJournal, type ExplainJournal } from "@/server/simple-explain";

const journal: ExplainJournal = {
  id: "j1",
  description: "Penjualan kredit ke PT Toko Maju",
  entryDate: "2026-08-10T00:00:00.000Z",
  lines: [
    { accountCode: "1-1000", accountName: "Kas", debit: 500000, credit: 0 },
    { accountCode: "4-1000", accountName: "Pendapatan Penjualan", debit: 0, credit: 500000 },
  ],
};

describe("simple-explain (K3 — bahasa sederhana)", () => {
  it("mengklasifikasikan akun dari digit pertama kode COA", () => {
    expect(classify("1-1000")).toBe("ASET");
    expect(classify("2-1000")).toBe("LIABILITAS");
    expect(classify("3-1000")).toBe("EKUITAS");
    expect(classify("4-1000")).toBe("PENDAPATAN");
    expect(classify("5-1000")).toBe("BEBAN");
    expect(classify("9-9999")).toBe("LAINNYA");
  });

  it("menghasilkan kalimat penjelasan non-akuntan", () => {
    const out = explainJournal(journal);
    expect(out).toContain("10 Agustus 2026");
    expect(out).toContain("Transaksi: Penjualan kredit ke PT Toko Maju");
    expect(out).toContain("Kas (debit Rp\u00A0500.000) — aset bertambah");
    expect(out).toContain("Pendapatan Penjualan (kredit Rp\u00A0500.000) — pendapatan bertambah");
  });

  it("merangkum dampak transaksi", () => {
    const out = summarizeJournal(journal);
    expect(out).toContain("Mencatat Rp\u00A0500.000");
    expect(out).toContain("Kas (debit)");
    expect(out).toContain("Pendapatan Penjualan (kredit)");
  });

  it("menangani jurnal tanpa nilai", () => {
    const empty = { ...journal, lines: [{ accountCode: "1-1000", accountName: "Kas", debit: 0, credit: 0 }] };
    expect(summarizeJournal(empty)).toBe("Jurnal tanpa nilai.");
  });

  it("menangani klasifikasi beban (kredit = beban berkurang)", () => {
    const refund = {
      ...journal,
      lines: [
        { accountCode: "5-1000", accountName: "Beban Gaji", debit: 0, credit: 100000 },
        { accountCode: "1-1000", accountName: "Kas", debit: 100000, credit: 0 },
      ],
    };
    expect(explainJournal(refund)).toContain("Beban Gaji (kredit Rp\u00A0100.000) — beban/biaya berkurang");
  });
});
