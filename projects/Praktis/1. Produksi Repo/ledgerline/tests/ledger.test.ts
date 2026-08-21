import { describe, expect, it, vi, beforeEach } from "vitest";

const { txMock, prismaMock } = vi.hoisted(() => {
  const txMock = {
    fiscalPeriod: {
      upsert: vi.fn(),
    },
    journalEntry: {
      updateMany: vi.fn(),
    },
    journalLine: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  };

  const prismaMock = {
    journalEntry: {
      findFirst: vi.fn(),
    },
    fiscalPeriod: {
      findUnique: vi.fn(),
    },
    clientProfile: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: typeof txMock) => unknown) => fn(txMock)),
  };

  return { txMock, prismaMock };
});

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { ManualJournalError } from "@/server/manual-journal";
import { lockPeriod, periodOf, reclassJournal } from "@/server/ledger";

const approvedJournal = {
  id: "j1",
  firmId: "f1",
  clientId: "c1",
  status: "APPROVED",
  entryDate: new Date(Date.UTC(2026, 7, 5)),
  lines: [
    { accountCode: "1-1100", accountName: "Kas", debit: 100_000, credit: 0 },
    { accountCode: "4-1000", accountName: "Pendapatan", debit: 0, credit: 100_000 },
  ],
};

const validLines = [
  { accountCode: "1-1100", accountName: "Kas", debit: 120_000, credit: 0, notes: null },
  { accountCode: "4-1000", accountName: "Pendapatan", debit: 0, credit: 120_000, notes: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.journalEntry.findFirst.mockResolvedValue(approvedJournal);
  prismaMock.fiscalPeriod.findUnique.mockResolvedValue({ status: "OPEN" });
  prismaMock.clientProfile.findUnique.mockResolvedValue(null); // tanpa mapping → free-text
  txMock.fiscalPeriod.upsert.mockResolvedValue({ status: "CLOSED" });
  txMock.journalEntry.updateMany.mockResolvedValue({ count: 3 });
});

describe("periodOf", () => {
  it("tanggal → periode YYYY-MM (UTC)", () => {
    expect(periodOf(new Date(Date.UTC(2026, 7, 5)))).toBe("2026-08");
    expect(periodOf(new Date(Date.UTC(2026, 0, 31)))).toBe("2026-01");
  });
});

describe("reclassJournal — guard & validasi", () => {
  it("jurnal tidak ditemukan → error", async () => {
    prismaMock.journalEntry.findFirst.mockResolvedValue(null);
    await expect(
      reclassJournal({ firmId: "f1", journalId: "x", lines: validLines, userId: "u1" }),
    ).rejects.toThrow(ManualJournalError);
  });

  it("jurnal bukan APPROVED (mis. FINALIZED) → error", async () => {
    prismaMock.journalEntry.findFirst.mockResolvedValue({ ...approvedJournal, status: "FINALIZED" });
    await expect(
      reclassJournal({ firmId: "f1", journalId: "j1", lines: validLines, userId: "u1" }),
    ).rejects.toThrow("Hanya jurnal APPROVED");
  });

  it("periode terkunci → error, arahkan ke jurnal penyesuaian", async () => {
    prismaMock.fiscalPeriod.findUnique.mockResolvedValue({ status: "CLOSED" });
    await expect(
      reclassJournal({ firmId: "f1", journalId: "j1", lines: validLines, userId: "u1" }),
    ).rejects.toThrow("Periode sudah terkunci");
  });

  it("jurnal tidak seimbang → error", async () => {
    const bad = [
      { accountCode: "1-1100", accountName: "Kas", debit: 10_000, credit: 0, notes: null },
      { accountCode: "4-1000", accountName: "Pendapatan", debit: 0, credit: 9_000, notes: null },
    ];
    await expect(
      reclassJournal({ firmId: "f1", journalId: "j1", lines: bad, userId: "u1" }),
    ).rejects.toThrow("Total debit harus sama dengan total kredit");
  });

  it("akun di luar COA klien → error", async () => {
    prismaMock.clientProfile.findUnique.mockResolvedValue({
      coaMapping: { k1: { accountCode: "1-1100", accountName: "Kas" } },
    });
    await expect(
      reclassJournal({ firmId: "f1", journalId: "j1", lines: validLines, userId: "u1" }),
    ).rejects.toThrow("tidak ada di COA klien");
  });

  it("sukses: baris diganti + audit trail JOURNAL_EDITED", async () => {
    const result = await reclassJournal({ firmId: "f1", journalId: "j1", lines: validLines, userId: "u1" });
    expect(result.id).toBe("j1");
    expect(txMock.journalLine.deleteMany).toHaveBeenCalledWith({ where: { journalEntryId: "j1" } });
    expect(txMock.journalLine.createMany).toHaveBeenCalled();
    const logCall = txMock.activityLog.create.mock.calls[0][0].data;
    expect(logCall.action).toBe("JOURNAL_EDITED");
    expect(logCall.detail.scope).toBe("koreksi");
    expect(logCall.detail.before).toHaveLength(2);
    expect(logCall.detail.after).toHaveLength(2);
  });
});

describe("lockPeriod", () => {
  it("periode sudah CLOSED → error", async () => {
    prismaMock.fiscalPeriod.findUnique.mockResolvedValue({ status: "CLOSED" });
    await expect(
      lockPeriod({ firmId: "f1", clientId: "c1", period: "2026-08", lockedById: "u1" }),
    ).rejects.toThrow("sudah terkunci");
  });

  it("sukses: upsert CLOSED + finalisasi jurnal APPROVED", async () => {
    const result = await lockPeriod({ firmId: "f1", clientId: "c1", period: "2026-08", lockedById: "u1" });
    expect(result.status).toBe("CLOSED");
    expect(result.finalized).toBe(3);
    expect(txMock.fiscalPeriod.upsert).toHaveBeenCalled();
    const where = txMock.journalEntry.updateMany.mock.calls[0][0].where;
    expect(where.status).toBe("APPROVED");
    expect(txMock.journalEntry.updateMany.mock.calls[0][0].data.status).toBe("FINALIZED");
  });

  it("periode belum pernah dibuka → tetap bisa dikunci (upsert create)", async () => {
    prismaMock.fiscalPeriod.findUnique.mockResolvedValue(null);
    const result = await lockPeriod({ firmId: "f1", clientId: "c1", period: "2026-08", lockedById: "u1" });
    expect(result.status).toBe("CLOSED");
    const upsertArgs = txMock.fiscalPeriod.upsert.mock.calls[0][0];
    expect(upsertArgs.create.status).toBe("CLOSED");
    expect(upsertArgs.create.lockedById).toBe("u1");
  });
});
