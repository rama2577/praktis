import { describe, expect, it } from "vitest";
import { knowledgeCategory } from "@/server/knowledge";
import { coaMappingHint, isValidCoaMapping } from "@/server/client-profile";

describe("knowledgeCategory (EN-01)", () => {
  it("mengategorikan file COA", () => {
    expect(knowledgeCategory("coa-retail.csv")).toBe("Chart of Accounts (COA)");
  });
  it("mengategorikan file pajak", () => {
    expect(knowledgeCategory("tax-rules-ppn.md")).toBe("Peraturan Pajak");
  });
  it("mengategorikan template jurnal & PSAK", () => {
    expect(knowledgeCategory("journal-templates.md")).toBe("Template Jurnal");
    expect(knowledgeCategory("psak-references.md")).toBe("Referensi PSAK");
  });
  it("fallback kategori Lainnya", () => {
    expect(knowledgeCategory("notes-random.txt")).toBe("Lainnya");
  });
});

describe("isValidCoaMapping (EN-02)", () => {
  it("menerima mapping yang benar", () => {
    const valid = { "1000": { accountCode: "1101", accountName: "Kas" } };
    expect(isValidCoaMapping(valid)).toBe(true);
  });
  it("menolak null/array/non-objek", () => {
    expect(isValidCoaMapping(null)).toBe(false);
    expect(isValidCoaMapping([])).toBe(false);
    expect(isValidCoaMapping("x")).toBe(false);
  });
  it("menolak entry tanpa accountCode/accountName", () => {
    expect(isValidCoaMapping({ "1000": { accountCode: "1101" } })).toBe(false);
    expect(isValidCoaMapping({ "1000": { accountName: "Kas" } })).toBe(false);
  });
  it("menolak mapping kosong", () => {
    expect(isValidCoaMapping({})).toBe(false);
  });
});

describe("coaMappingHint (EN-02)", () => {
  const profile = {
    mappingStatus: "READY" as const,
    coaMapping: {
      "1000": { accountCode: "1101", accountName: "Kas" },
      "4110": { accountCode: "4101", accountName: "Pendapatan Penjualan", note: "penjualan tunai" },
    },
  };

  it("null saat profile tidak ada atau bukan READY", () => {
    expect(coaMappingHint(null)).toBeNull();
    expect(coaMappingHint({ ...profile, mappingStatus: "REVIEW" })).toBeNull();
  });
  it("menghasilkan hint berisi mapping kode klien → akun standar", () => {
    const hint = coaMappingHint(profile);
    expect(hint).toContain("1000 → 1101 Kas");
    expect(hint).toContain("4110 → 4101 Pendapatan Penjualan");
  });
  it("null saat mapping kosong", () => {
    expect(coaMappingHint({ mappingStatus: "READY", coaMapping: {} })).toBeNull();
  });
});
