import { describe, expect, it } from "vitest";
import { avg, pct } from "@/server/metrics";
import { knowledgeCategory } from "@/server/knowledge";

describe("metrics helpers", () => {
  it("pct: 0 jika total 0; 1 desimal", () => {
    expect(pct(5, 0)).toBe(0);
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(0, 22)).toBe(0);
    expect(pct(22, 22)).toBe(100);
  });

  it("avg: null jika kosong; 4 desimal", () => {
    expect(avg([])).toBeNull();
    expect(avg([0.9, 0.94, 0.95])).toBe(0.93);
    expect(avg([0.55])).toBe(0.55);
  });
});

describe("knowledge categories", () => {
  it("mengelompokkan nama file ke kategori", () => {
    expect(knowledgeCategory("business-events.md")).toBe("Business Events");
    expect(knowledgeCategory("journal-templates.md")).toBe("Template Jurnal");
    expect(knowledgeCategory("coa-retail.csv")).toBe("Chart of Accounts (COA)");
    expect(knowledgeCategory("tax-rules-ppn.md")).toBe("Peraturan Pajak");
    expect(knowledgeCategory("psak-references.md")).toBe("Referensi PSAK");
    expect(knowledgeCategory("validation-rules.md")).toBe("Validasi & Materialitas");
  });
});
