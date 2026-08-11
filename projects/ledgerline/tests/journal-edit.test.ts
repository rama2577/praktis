import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { computeCorrections, validateEditLines } from "@/server/journal-edit";
import type { JournalLine } from "@prisma/client";

function line(partial: Partial<JournalLine>): JournalLine {
  return {
    id: partial.id ?? "l1",
    journalEntryId: partial.journalEntryId ?? "j1",
    accountCode: partial.accountCode ?? "1-1100",
    accountName: partial.accountName ?? "Kas dan Setara Kas",
    debit: partial.debit ?? new Prisma.Decimal(0),
    credit: partial.credit ?? new Prisma.Decimal(0),
    psakRef: partial.psakRef ?? null,
    notes: partial.notes ?? null,
    taxCode: partial.taxCode ?? null,
    taxBase: partial.taxBase ?? null,
  };
}

describe("F2.5B — computeCorrections (diff baris jurnal)", () => {
  const existing = [
    line({ id: "l1", accountCode: "1-1100", accountName: "Kas dan Setara Kas", debit: new Prisma.Decimal(1000), notes: "Pembayaran" }),
    line({ id: "l2", accountCode: "5-1000", accountName: "Beban Gaji", credit: new Prisma.Decimal(1000) }),
  ];

  it("tanpa perubahan → tidak ada koreksi", () => {
    const c = computeCorrections(existing, [
      { id: "l1", accountCode: "1-1100", accountName: "Kas dan Setara Kas", debit: 1000, credit: 0, notes: "Pembayaran" },
      { id: "l2", accountCode: "5-1000", accountName: "Beban Gaji", debit: 0, credit: 1000 },
    ]);
    expect(c).toHaveLength(0);
  });

  it("ubah nominal & nama akun → koreksi per field (angka dinormalisasi)", () => {
    const c = computeCorrections(existing, [
      { id: "l1", accountCode: "1-1100", accountName: "Kas", debit: "1250.00", credit: 0, notes: "Pembayaran" },
      { id: "l2", accountCode: "5-1000", accountName: "Beban Gaji", debit: 0, credit: "1250" },
    ]);
    const fields = c.map((x) => x.field);
    expect(fields).toContain("accountName");
    expect(fields).toContain("debit");
    expect(fields).toContain("credit");
    const debit = c.find((x) => x.field === "debit")!;
    expect(debit.before).toBe("1000");
    expect(debit.after).toBe("1250");
    expect(debit.accountCode).toBe("1-1100");
  });

  it("baris baru → seluruh field tercatat dari kosong", () => {
    const c = computeCorrections(existing, [
      { id: "l1", accountCode: "1-1100", accountName: "Kas dan Setara Kas", debit: 1000, credit: 0, notes: "Pembayaran" },
      { id: "l2", accountCode: "5-1000", accountName: "Beban Gaji", debit: 0, credit: 1000 },
      { accountCode: "2-1000", accountName: "Utang Usaha", debit: 0, credit: 500 },
    ]);
    const newLine = c.filter((x) => x.accountCode === "2-1000");
    expect(newLine.length).toBeGreaterThanOrEqual(2);
    expect(newLine.find((x) => x.field === "accountCode")!.after).toBe("2-1000");
  });

  it("baris dihapus → tercatat (notes sebelum terisi → null)", () => {
    const c = computeCorrections(existing, [
      { id: "l1", accountCode: "1-1100", accountName: "Kas dan Setara Kas", debit: 1000, credit: 0, notes: "Pembayaran" },
    ]);
    const removed = c.filter((x) => x.accountCode === "5-1000" && x.field === "credit");
    expect(removed).toHaveLength(1);
    expect(removed[0].before).toBe("1000");
    expect(removed[0].after).toBe("0");
  });

  it("'0' vs 0 vs '0.00' tidak dianggap perubahan", () => {
    const c = computeCorrections(existing, [
      { id: "l1", accountCode: "1-1100", accountName: "Kas dan Setara Kas", debit: "1000", credit: "0.00", notes: "Pembayaran" },
      { id: "l2", accountCode: "5-1000", accountName: "Beban Gaji", debit: 0, credit: "1000" },
    ]);
    expect(c).toHaveLength(0);
  });
});

describe("F2.5B — validateEditLines", () => {
  const good = [
    { accountCode: "1-1100", accountName: "Kas", debit: 500000, credit: 0 },
    { accountCode: "4-1000", accountName: "Pendapatan", debit: 0, credit: 500000 },
  ];

  it("input valid → ok", () => {
    const r = validateEditLines({ lines: good });
    expect(r.ok).toBe(true);
  });

  it("mempertahankan id baris lama (kunci diff yang benar)", () => {
    const r = validateEditLines({
      lines: [
        { id: "line-abc", accountCode: "1-1100", accountName: "Kas", debit: 500000, credit: 0 },
        { id: "line-def", accountCode: "4-1000", accountName: "Pendapatan", debit: 0, credit: 500000 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lines[0].id).toBe("line-abc");
      expect(r.lines[1].id).toBe("line-def");
    }
  });

  it("baris baru tanpa id → id undefined", () => {
    const r = validateEditLines({ lines: good });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lines.every((l) => l.id === undefined)).toBe(true);
  });

  it("kurang dari 2 baris → tolak", () => {
    const r = validateEditLines({ lines: [good[0]] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/2 baris/i);
  });

  it("tidak seimbang → tolak", () => {
    const r = validateEditLines({
      lines: [
        { accountCode: "1-1100", accountName: "Kas", debit: 100, credit: 0 },
        { accountCode: "4-1000", accountName: "Pendapatan", debit: 0, credit: 90 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/debit.*kredit|seimbang/i);
  });

  it("kode/nama akun kosong → tolak", () => {
    const r = validateEditLines({
      lines: [
        { accountCode: "", accountName: "Kas", debit: 100, credit: 0 },
        { accountCode: "4-1000", accountName: "Pendapatan", debit: 0, credit: 100 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/kode dan nama akun/i);
  });

  it("debit dan kredit bersamaan → tolak", () => {
    const r = validateEditLines({
      lines: [
        { accountCode: "1-1100", accountName: "Kas", debit: 100, credit: 50 },
        { accountCode: "4-1000", accountName: "Pendapatan", debit: 0, credit: 150 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/bersamaan/i);
  });

  it("bukan array / kosong → tolak", () => {
    expect(validateEditLines({}).ok).toBe(false);
    expect(validateEditLines({ lines: [] }).ok).toBe(false);
    expect(validateEditLines({ lines: "x" }).ok).toBe(false);
  });
});
