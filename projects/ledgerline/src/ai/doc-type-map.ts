import type { DocumentType } from "@prisma/client";
import type { EventKind } from "@/ai/rule-engine";

/**
 * F2.5C (PRD v2 M2) — Katalog 9 kategori dokumen + mapping jenis → jenis jurnal.
 *
 * - ACTIVE_DOC_TYPES: 9 kategori yang ditawarkan di UI upload.
 * - LEGACY_DOC_TYPES: INVOICE/RECEIPT dipertahankan untuk backward-compat
 *   (data lama tetap valid), tapi tidak lagi ditawarkan sebagai pilihan baru.
 * - journalHintForDocType: panduan untuk AI/rule-engine — memperkuat akurasi
 *   draft jurnal sesuai jenis dokumen (laporan gaji → beban gaji + PPh 21, dst).
 */

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  FINANCIAL_STATEMENT: "Laporan Keuangan",
  GENERAL_JOURNAL: "Jurnal Umum",
  BANK_STATEMENT: "Rekening Koran / Bank",
  PAYABLES_REPORT: "Laporan Hutang / Pembelian",
  RECEIVABLES_REPORT: "Laporan Piutang / Penjualan",
  INVENTORY_REPORT: "Laporan Inventory",
  PAYROLL_REPORT: "Laporan Gaji",
  TAX_REPORT: "Laporan Pajak",
  OTHER: "Lain-lain",
  INVOICE: "Invoice",
  RECEIPT: "Nota / Kwitansi",
};

/** 9 kategori utama — urutan tampilan di upload form. */
export const ACTIVE_DOC_TYPES: DocumentType[] = [
  "BANK_STATEMENT",
  "FINANCIAL_STATEMENT",
  "GENERAL_JOURNAL",
  "PAYABLES_REPORT",
  "RECEIVABLES_REPORT",
  "INVENTORY_REPORT",
  "PAYROLL_REPORT",
  "TAX_REPORT",
  "OTHER",
];

/** Jenis legacy yang masih diterima API (backward-compat). */
export const LEGACY_DOC_TYPES: DocumentType[] = ["INVOICE", "RECEIPT"];

export const ALL_DOC_TYPES: DocumentType[] = [...ACTIVE_DOC_TYPES, ...LEGACY_DOC_TYPES];

export type DocJournalHint = {
  /** Jenis event yang disarankan untuk dokumen ini (null → tidak dikunci). */
  kind: EventKind | null;
  /** Kode template jurnal yang disarankan (null → deteksi bebas). */
  template: string | null;
  /** Panduan bahasa manusia untuk AI/rule-engine saat menyusun draft. */
  hint: string;
};

/**
 * Preferensi jenis event per jenis dokumen — dipakai rule-engine untuk
 * memprioritaskan deteksi (dokumen laporan hutang → jurnal pembelian, dst.).
 */
export const DOC_KIND_PREFERENCE: Partial<Record<DocumentType, EventKind[]>> = {
  BANK_STATEMENT: ["RECEIPT", "PAYMENT"],
  PAYABLES_REPORT: ["PURCHASE"],
  RECEIVABLES_REPORT: ["SALES_CREDIT", "SALES_CASH"],
  INVENTORY_REPORT: ["PURCHASE"],
  INVOICE: ["SALES_CREDIT", "SALES_CASH", "PURCHASE"],
  RECEIPT: ["RECEIPT", "PAYMENT"],
};

export function journalHintForDocType(docType: DocumentType): DocJournalHint {
  switch (docType) {
    case "BANK_STATEMENT":
      return {
        kind: null,
        template: null,
        hint: "Rekening koran → transaksi kas/bank: penerimaan (debit kas) & pembayaran (kredit kas). Pisahkan per baris transaksi.",
      };
    case "FINANCIAL_STATEMENT":
      return {
        kind: null,
        template: "T-006",
        hint: "Laporan keuangan → jurnal pembuka/penyesuaian: saldo awal aset, liabilitas, ekuitas, dan laba ditahan.",
      };
    case "GENERAL_JOURNAL":
      return {
        kind: null,
        template: "T-006",
        hint: "Jurnal umum → posting langsung sesuai deskripsi baris (debit = kredit).",
      };
    case "PAYABLES_REPORT":
      return {
        kind: "PURCHASE",
        template: "T-005",
        hint: "Laporan hutang/pembelian → utang usaha (kredit) lawan persediaan/beban (debit).",
      };
    case "RECEIVABLES_REPORT":
      return {
        kind: "SALES_CREDIT",
        template: "T-001",
        hint: "Laporan piutang/penjualan → piutang usaha (debit) lawan pendapatan (kredit).",
      };
    case "INVENTORY_REPORT":
      return {
        kind: "PURCHASE",
        template: "T-005",
        hint: "Laporan inventory → persediaan (debit) & HPP; selisih stok → jurnal penyesuaian persediaan.",
      };
    case "PAYROLL_REPORT":
      return {
        kind: null,
        template: "T-007",
        hint: "Laporan gaji → beban gaji (debit), utang gaji, dan utang PPh 21 (kredit).",
      };
    case "TAX_REPORT":
      return {
        kind: null,
        template: "T-008",
        hint: "Laporan pajak → jurnal PPN masukan/keluaran dan/atau PPh sesuai jenis pajak.",
      };
    case "OTHER":
      return {
        kind: null,
        template: null,
        hint: "Dokumen lain-lain → deteksi event dari isi dokumen; jika tidak jelas, buat jurnal umum.",
      };
    case "INVOICE":
      return {
        kind: null,
        template: null,
        hint: "Invoice → penjualan kredit (piutang & pendapatan) atau pembelian (utang & beban/persediaan).",
      };
    case "RECEIPT":
      return {
        kind: null,
        template: null,
        hint: "Nota/kwitansi → penerimaan kas (debit kas) atau pembayaran (kredit kas).",
      };
  }
}
