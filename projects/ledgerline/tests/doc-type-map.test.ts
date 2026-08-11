import { describe, expect, it } from "vitest";
import {
  ACTIVE_DOC_TYPES,
  ALL_DOC_TYPES,
  DOC_TYPE_LABELS,
  LEGACY_DOC_TYPES,
  journalHintForDocType,
} from "@/ai/doc-type-map";
import { detectBusinessEvent } from "@/ai/rule-engine";

describe("katalog kategori dokumen (F2.5C / PRD M2 / F6C)", () => {
  it("12 kategori utama + 2 legacy = 14 total (termasuk referensi F6C)", () => {
    expect(ACTIVE_DOC_TYPES).toHaveLength(12);
    expect(ACTIVE_DOC_TYPES).toEqual(expect.arrayContaining(["LEGAL_DOCUMENT", "ORGANIZATION_CHART", "KNOWLEDGE_ARTICLE"]));
    expect(LEGACY_DOC_TYPES).toEqual(["INVOICE", "RECEIPT"]);
    expect(ALL_DOC_TYPES).toHaveLength(14);
    expect(new Set(ALL_DOC_TYPES).size).toBe(14); // tidak ada duplikat
  });

  it("semua jenis punya label Indonesia", () => {
    for (const t of ALL_DOC_TYPES) {
      expect(DOC_TYPE_LABELS[t]).toBeTruthy();
      expect(DOC_TYPE_LABELS[t]).not.toBe(t); // bukan sekadar enum mentah
    }
    expect(DOC_TYPE_LABELS.PAYROLL_REPORT).toBe("Laporan Gaji");
    expect(DOC_TYPE_LABELS.TAX_REPORT).toBe("Laporan Pajak");
    expect(DOC_TYPE_LABELS.FINANCIAL_STATEMENT).toBe("Laporan Keuangan");
  });

  it("semua jenis punya panduan penyusunan jurnal (hint non-kosong)", () => {
    for (const t of ALL_DOC_TYPES) {
      const h = journalHintForDocType(t);
      expect(h.hint.length).toBeGreaterThan(10);
    }
  });

  it("mapping jenis → jenis jurnal yang diharapkan", () => {
    expect(journalHintForDocType("PAYABLES_REPORT").kind).toBe("PURCHASE");
    expect(journalHintForDocType("RECEIVABLES_REPORT").kind).toBe("SALES_CREDIT");
    expect(journalHintForDocType("INVENTORY_REPORT").kind).toBe("PURCHASE");
    expect(journalHintForDocType("PAYROLL_REPORT").template).toBe("T-007");
    expect(journalHintForDocType("TAX_REPORT").template).toBe("T-008");
    expect(journalHintForDocType("BANK_STATEMENT").kind).toBeNull();
  });
});

describe("rule-engine memakai preferensi jenis dokumen baru", () => {
  it("laporan hutang → event pembelian", () => {
    const r = detectBusinessEvent("faktur pembelian barang dagang dari PT Supplier", "PAYABLES_REPORT");
    expect(r?.kind).toBe("PURCHASE");
  });

  it("laporan piutang → event penjualan kredit", () => {
    const r = detectBusinessEvent("faktur penjualan ke PT Customer secara kredit", "RECEIVABLES_REPORT");
    expect(r?.kind).toBe("SALES_CREDIT");
  });

  it("laporan inventory → event pembelian", () => {
    const r = detectBusinessEvent("pembelian stok persediaan bulan ini", "INVENTORY_REPORT");
    expect(r?.kind).toBe("PURCHASE");
  });

  it("backward-compat: INVOICE & RECEIPT tetap berfungsi", () => {
    expect(detectBusinessEvent("faktur pembelian", "INVOICE")?.kind).toBe("PURCHASE");
    expect(detectBusinessEvent("pelunasan piutang", "RECEIPT")?.kind).toBe("RECEIPT");
    expect(detectBusinessEvent("transfer masuk", "BANK_STATEMENT")?.kind).toBe("RECEIPT");
  });

  it("jenis tanpa preferensi (TAX_REPORT) tetap mengembalikan deteksi keyword", () => {
    const r = detectBusinessEvent("pembayaran PPN masa Juli", "TAX_REPORT");
    expect(r).not.toBeNull();
  });
});
