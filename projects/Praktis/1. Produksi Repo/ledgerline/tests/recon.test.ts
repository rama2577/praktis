import { describe, expect, it } from "vitest";
import {
  buildReconSummary,
  reconCsv,
  suggestMatches,
  type BankMutationRow,
  type CashJournalLine,
} from "@/server/recon";

const mut = (over: Partial<BankMutationRow>): BankMutationRow => ({
  id: "m1",
  date: "2026-08-10T00:00:00.000Z",
  description: "Transfer masuk",
  amount: 5_000_000,
  matchStatus: "UNMATCHED",
  matchedJournalId: null,
  matchScore: null,
  ...over,
});

const jrn = (over: Partial<CashJournalLine>): CashJournalLine => ({
  journalId: "j1",
  entryDate: "2026-08-10T00:00:00.000Z",
  description: "Penerimaan transfer",
  accountCode: "1-1000",
  accountName: "Kas",
  debit: 5_000_000,
  credit: 0,
  ...over,
});

describe("recon — AI matching suggestion (F6A)", () => {
  it("jumlah sama & tanggal dekat → skor 1.0", () => {
    const s = suggestMatches([mut({ id: "a" })], [jrn({ journalId: "j1" })]);
    expect(s).toHaveLength(1);
    expect(s[0].score).toBe(1);
    expect(s[0].reason).toContain("tanggal dekat");
  });

  it("jumlah sama, tanggal ±15 hari → skor 0.85", () => {
    const s = suggestMatches(
      [mut({ id: "a", date: "2026-08-01T00:00:00.000Z" })],
      [jrn({ journalId: "j1", entryDate: "2026-08-12T00:00:00.000Z" })],
    );
    expect(s).toHaveLength(1);
    // 0.85 + bonus kata kunci "transfer" (0.02) = 0.87
    expect(s[0].score).toBe(0.87);
  });

  it("jumlah beda > Rp100 → tidak cocok", () => {
    const s = suggestMatches(
      [mut({ id: "a", amount: 5_000_000 })],
      [jrn({ journalId: "j1", debit: 5_100_000 })],
    );
    expect(s).toHaveLength(0);
  });

  it("jurnal yang sudah dipakai tidak dipakai lagi", () => {
    const s = suggestMatches(
      [
        mut({ id: "a", amount: 5_000_000 }),
        mut({ id: "b", amount: 5_000_000, date: "2026-08-11T00:00:00.000Z" }),
      ],
      [jrn({ journalId: "j1" })],
    );
    expect(s).toHaveLength(1);
  });

  it("mutasi keluar (negatif) cocok dengan credit jurnal", () => {
    const s = suggestMatches(
      [mut({ id: "a", amount: -2_000_000, description: "Pembayaran supplier" })],
      [jrn({ journalId: "j1", debit: 0, credit: 2_000_000, description: "Pembayaran utang" })],
    );
    expect(s).toHaveLength(1);
    expect(s[0].journalAmount).toBe(2_000_000);
  });

  it("mutasi sudah MATCHED tidak disarankan lagi", () => {
    const s = suggestMatches(
      [mut({ id: "a", matchStatus: "MATCHED", matchedJournalId: "j9" })],
      [jrn({ journalId: "j1" })],
    );
    expect(s).toHaveLength(0);
  });
});

describe("recon — ringkasan & outstanding", () => {
  const mutations: BankMutationRow[] = [
    mut({ id: "a", amount: 5_000_000 }),
    mut({ id: "b", amount: -2_000_000, matchStatus: "MATCHED", matchedJournalId: "j2" }),
  ];
  const journals: CashJournalLine[] = [
    jrn({ journalId: "j1", debit: 5_000_000 }),
    jrn({ journalId: "j2", debit: 0, credit: 2_000_000 }),
  ];

  it("menghitung total, matched, dan outstanding", () => {
    const s = buildReconSummary("2026-08", mutations, journals);
    expect(s.totalMutations).toBe(2);
    expect(s.totalMatched).toBe(1);
    expect(s.bankIn).toBe(5_000_000);
    expect(s.bankOut).toBe(2_000_000);
    expect(s.outstandingMutations).toHaveLength(1);
    expect(s.outstandingJournals).toHaveLength(1); // j1 belum dipakai (j2 dipakai)
  });

  it("CSV memuat ringkasan & outstanding", () => {
    const csv = reconCsv(buildReconSummary("2026-08", mutations, journals), "CV Berkah Abadi");
    expect(csv).toContain("REKONSILIASI BANK");
    expect(csv).toContain("OUTSTANDING — MUTASI TANPA JURNAL");
    expect(csv).toContain("OUTSTANDING — JURNAL TANPA MUTASI");
  });
});
