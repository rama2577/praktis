import { describe, expect, it } from "vitest";
import {
  parseRupiah,
  detectBusinessEvent,
  buildDraftJournal,
  buildTemplateLines,
} from "@/ai/rule-engine";
import { validateDraftLines } from "@/ai/validation";

// ── parseRupiah ──────────────────────────────────────────────────────────

describe("parseRupiah", () => {
  it("memformat Rp dengan titik ribuan", () => {
    expect(parseRupiah("Total: Rp 1.500.000")).toBe(1500000);
    expect(parseRupiah("Rp1.234.567")).toBe(1234567);
  });

  it("menangani koma desimal", () => {
    expect(parseRupiah("Rp 1.500.000,50")).toBe(1500000.5);
    expect(parseRupiah("Rp 250.000,00")).toBe(250000);
  });

  it("menangani angka tanpa pemisah", () => {
    expect(parseRupiah("nominal 8500000")).toBe(8500000);
  });

  it("mengembalikan null jika tidak ada nominal", () => {
    expect(parseRupiah("tidak ada angka di sini")).toBeNull();
    expect(parseRupiah("Rp 0")).toBeNull();
  });

  it("mengabaikan nominal negatif", () => {
    expect(parseRupiah("Rp -5.000")).toBeNull();
  });
});

// ── detectBusinessEvent ──────────────────────────────────────────────────

describe("detectBusinessEvent", () => {
  it("mendeteksi penjualan kredit dari invoice", () => {
    const r = detectBusinessEvent("Faktur penjualan kredit untuk PT Maju Jaya", "INVOICE");
    expect(r?.kind).toBe("SALES_CREDIT");
  });

  it("mendeteksi pembelian dari invoice", () => {
    const r = detectBusinessEvent("Invoice pembelian persediaan barang", "INVOICE");
    expect(r?.kind).toBe("PURCHASE");
  });

  it("mendeteksi penerimaan piutang dari rekening koran", () => {
    const r = detectBusinessEvent("Setoran pelunasan piutang PT Sentosa", "BANK_STATEMENT");
    expect(r?.kind).toBe("RECEIPT");
  });

  it("mengembalikan null untuk teks tanpa pola", () => {
    expect(detectBusinessEvent("lorem ipsum dolor sit amet", "INVOICE")).toBeNull();
  });
});

// ── buildDraftJournal ────────────────────────────────────────────────────

describe("buildDraftJournal", () => {
  it("menghasilkan jurnal DRAFT balance untuk invoice penjualan + PPN", () => {
    const text = "INVOICE PENJUALAN KREDIT\nPT Maju Jaya\nTotal: Rp 8.500.000\nPPN 11%";
    const draft = buildDraftJournal(text, { industry: "RETAIL", docType: "INVOICE" });
    expect(draft.detectedEvent).toBe("SALES_CREDIT");
    expect(draft.exceptionFlag).toBeNull();
    expect(draft.lines.length).toBe(3);

    const validation = validateDraftLines(draft.lines);
    expect(validation.ok).toBe(true);

    // traceability wajib
    for (const line of draft.lines) {
      expect(line.accountCode).toBeTruthy();
      expect(line.psakRef).toBeTruthy();
    }
    // PPN 11% dari 8.500.000 = 935.000; piutang = 9.435.000
    const piutang = draft.lines.find((l) => l.accountCode === "1-1200");
    const ppn = draft.lines.find((l) => l.accountCode === "2-2000");
    expect(piutang?.debit).toBe(9435000);
    expect(ppn?.credit).toBe(935000);
    expect(draft.confidence).toBeGreaterThan(0.6);
  });

  it("menghasilkan jurnal pembelian dengan PPN masukan", () => {
    const text = "FAKTUR PEMBELIAN PERSEDIAAN\nTotal Rp 4.000.000\nPPN";
    const draft = buildDraftJournal(text, { industry: "FNB", docType: "INVOICE" });
    const validation = validateDraftLines(draft.lines);
    expect(validation.ok).toBe(true);
    const ppnMasukan = draft.lines.find((l) => l.accountCode === "1-1400");
    expect(ppnMasukan?.debit).toBe(440000);
  });

  it("menandai EXCEPTION jika tidak ada nominal", () => {
    const draft = buildDraftJournal("Faktur penjualan kredit tanpa angka", { industry: "RETAIL", docType: "INVOICE" });
    expect(draft.exceptionFlag).toContain("Jumlah nominal");
    expect(draft.lines).toHaveLength(0);
    expect(draft.confidence).toBeLessThan(0.6);
  });

  it("menandai EXCEPTION jika event tidak terdeteksi", () => {
    const draft = buildDraftJournal("Rp 5.000.000 dokumen tak jelas isinya", { industry: "RETAIL", docType: "INVOICE" });
    expect(draft.exceptionFlag).toContain("Business event");
  });

  it("menghasilkan jurnal penerimaan piutang dari rekening koran", () => {
    const text = "Transfer masuk pelunasan piutang Rp 2.500.000";
    const draft = buildDraftJournal(text, { industry: "SERVICES", docType: "BANK_STATEMENT" });
    const validation = validateDraftLines(draft.lines);
    expect(validation.ok).toBe(true);
    expect(draft.lines).toHaveLength(2);
    const kas = draft.lines.find((l) => l.accountCode === "1-1000");
    expect(kas?.debit).toBe(2500000);
  });
});

// ── validateDraftLines ───────────────────────────────────────────────────

describe("validateDraftLines", () => {
  it("menolak jurnal tidak balance", () => {
    const lines = [
      { accountCode: "1-1000", accountName: "Kas", debit: 1000, credit: 0, psakRef: "PSAK 72" },
      { accountCode: "4-1000", accountName: "Pendapatan", debit: 0, credit: 900, psakRef: "PSAK 72" },
    ];
    const r = validateDraftLines(lines);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("balance");
  });

  it("menolak baris tanpa psakRef (traceability)", () => {
    const lines = buildTemplateLines(
      { kind: "SALES_CASH", template: "T-001", psakRef: "PSAK 72" },
      1000000,
      { withPpn: false },
    ).map((l) => ({ ...l, psakRef: "" }));
    const r = validateDraftLines(lines);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("psakRef");
  });

  it("menerima jurnal balance & lengkap", () => {
    const lines = buildTemplateLines(
      { kind: "SALES_CASH", template: "T-001", psakRef: "PSAK 72" },
      1000000,
      { withPpn: true },
    );
    const r = validateDraftLines(lines);
    expect(r.ok).toBe(true);
  });

  it("menolak daftar baris kosong", () => {
    const r = validateDraftLines([]);
    expect(r.ok).toBe(false);
  });
});
