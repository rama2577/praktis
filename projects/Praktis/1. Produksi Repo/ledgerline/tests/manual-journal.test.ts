import { describe, expect, it } from "vitest";
import {
  coaAccountsFromMapping,
  journalIsBalanced,
  validateLinesAgainstCoa,
  validateManualJournalInput,
  type ManualLineInput,
} from "@/server/manual-journal";

const balanced: ManualLineInput[] = [
  { accountCode: "1-1100", accountName: "Kas", debit: 100_000 },
  { accountCode: "4-1000", accountName: "Pendapatan", credit: 100_000 },
];

describe("journalIsBalanced — validasi keseimbangan jurnal manual", () => {
  it("jurnal seimbang (debit = kredit) diterima", () => {
    const r = journalIsBalanced(balanced);
    expect(r.ok).toBe(true);
    expect(r.totalDebit).toBe(100_000);
    expect(r.totalCredit).toBe(100_000);
  });

  it("kurang dari 2 baris ditolak", () => {
    expect(journalIsBalanced([balanced[0]]).ok).toBe(false);
    expect(journalIsBalanced([]).ok).toBe(false);
  });

  it("total debit ≠ kredit ditolak", () => {
    const r = journalIsBalanced([
      { accountCode: "1-1100", accountName: "Kas", debit: 100_000 },
      { accountCode: "4-1000", accountName: "Pendapatan", credit: 90_000 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("sama dengan total kredit");
  });

  it("baris dengan debit dan kredit bersamaan ditolak", () => {
    const r = journalIsBalanced([
      { accountCode: "1-1100", accountName: "Kas", debit: 100_000, credit: 100_000 },
      { accountCode: "4-1000", accountName: "Pendapatan", credit: 100_000 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("bersamaan");
  });

  it("baris kosong (0 debit & 0 kredit) ditolak", () => {
    const r = journalIsBalanced([
      { accountCode: "1-1100", accountName: "Kas" },
      { accountCode: "4-1000", accountName: "Pendapatan", credit: 100_000 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("wajib diisi");
  });

  it("nilai negatif ditolak", () => {
    const r = journalIsBalanced([
      { accountCode: "1-1100", accountName: "Kas", debit: -100_000 },
      { accountCode: "4-1000", accountName: "Pendapatan", credit: 100_000 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("negatif");
  });

  it("toleransi pembulatan ≤ 0,005 diterima", () => {
    const r = journalIsBalanced([
      { accountCode: "1-1100", accountName: "Kas", debit: 100_000.001 },
      { accountCode: "4-1000", accountName: "Pendapatan", credit: 100_000 },
    ]);
    expect(r.ok).toBe(true);
  });
});

describe("validateManualJournalInput — validasi body request", () => {
  it("body valid diterima", () => {
    const r = validateManualJournalInput({
      clientId: "c1",
      entryDate: "2026-08-01",
      description: "Penyesuaian penyusutan",
      lines: balanced,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clientId).toBe("c1");
      expect(r.entryDate.toISOString().slice(0, 10)).toBe("2026-08-01");
    }
  });

  it("klien kosong ditolak", () => {
    const r = validateManualJournalInput({ description: "x", lines: balanced });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Klien");
  });

  it("deskripsi kosong ditolak", () => {
    const r = validateManualJournalInput({ clientId: "c1", lines: balanced });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Deskripsi");
  });

  it("tanggal tidak valid ditolak", () => {
    const r = validateManualJournalInput({
      clientId: "c1",
      entryDate: "bukan-tanggal",
      description: "x",
      lines: balanced,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Tanggal");
  });

  it("baris dengan kode/nama akun kosong ditolak", () => {
    const r = validateManualJournalInput({
      clientId: "c1",
      description: "x",
      lines: [
        { accountCode: "", accountName: "Kas", debit: 100_000 },
        { accountCode: "4-1000", accountName: "Pendapatan", credit: 100_000 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Kode dan nama akun");
  });
});

describe("coaAccountsFromMapping — ekstraksi COA klien", () => {
  it("mengubah coaMapping ke daftar akun unik & terurut", () => {
    const r = coaAccountsFromMapping({
      "1000": { accountCode: "1-1100", accountName: "Kas dan Setara Kas" },
      "4100": { accountCode: "4-1000", accountName: "Pendapatan Penjualan" },
      "1100": { accountCode: "1-1200", accountName: "Piutang Usaha" },
    });
    expect(r).toEqual([
      { accountCode: "1-1100", accountName: "Kas dan Setara Kas" },
      { accountCode: "1-1200", accountName: "Piutang Usaha" },
      { accountCode: "4-1000", accountName: "Pendapatan Penjualan" },
    ]);
  });

  it("menyaring entri tidak valid & duplikat accountCode", () => {
    const r = coaAccountsFromMapping({
      "1000": { accountCode: "1-1100", accountName: "Kas" },
      "2000": { accountCode: "1-1100", accountName: "Kas (duplikat)" },
      "3000": { accountCode: "", accountName: "Kosong" },
      "4000": { accountName: "Tanpa kode" },
      "5000": "bukan objek",
    });
    expect(r).toEqual([{ accountCode: "1-1100", accountName: "Kas" }]);
  });

  it("mapping null/kosong → daftar kosong", () => {
    expect(coaAccountsFromMapping(null)).toEqual([]);
    expect(coaAccountsFromMapping({})).toEqual([]);
    expect(coaAccountsFromMapping("x")).toEqual([]);
  });
});

describe("validateLinesAgainstCoa — akun jurnal harus milik COA klien", () => {
  const mapping = {
    "1000": { accountCode: "1-1100", accountName: "Kas dan Setara Kas" },
    "4100": { accountCode: "4-1000", accountName: "Pendapatan Penjualan" },
  };

  it("semua akun terpetakan → diterima", () => {
    const r = validateLinesAgainstCoa(
      [
        { accountCode: "1-1100" },
        { accountCode: "4-1000" },
      ],
      mapping,
    );
    expect(r.ok).toBe(true);
  });

  it("akun di luar COA klien → ditolak", () => {
    const r = validateLinesAgainstCoa(
      [
        { accountCode: "1-1100" },
        { accountCode: "9-9999" },
      ],
      mapping,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("9-9999");
  });

  it("COA belum dipetakan (kosong) → validasi dilewati", () => {
    expect(validateLinesAgainstCoa([{ accountCode: "9-9999" }], null).ok).toBe(true);
    expect(validateLinesAgainstCoa([{ accountCode: "9-9999" }], {}).ok).toBe(true);
  });
});
