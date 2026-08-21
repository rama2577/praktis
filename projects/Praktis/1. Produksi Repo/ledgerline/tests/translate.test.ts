import { describe, expect, it } from "vitest";
import { looksLikeForeign } from "@/ai/translate";

describe("looksLikeForeign (heuristik bahasa Inggris)", () => {
  it("teks Inggris dominan → true", () => {
    const en = "Invoice Number 001 for the purchase of office supplies. The total amount is due on the date of receipt. Payment was received from the company account with tax included in the value of the sales invoice.";
    expect(looksLikeForeign(en)).toBe(true);
  });

  it("teks Indonesia → false", () => {
    const id = "Faktur pembelian perlengkapan kantor dengan total Rp 2.500.000 termasuk PPN sebelas persen dibayar tunai pada tanggal lima belas Agustus dua ribu dua puluh enam oleh bagian keuangan.";
    expect(looksLikeForeign(id)).toBe(false);
  });

  it("teks pendek → false (tidak cukup sinyal)", () => {
    expect(looksLikeForeign("Invoice total 100")).toBe(false);
  });
});
