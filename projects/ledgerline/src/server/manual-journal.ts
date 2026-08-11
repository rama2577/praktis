import { JournalType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export class ManualJournalError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type ManualLineInput = {
  accountCode: string;
  accountName: string;
  debit?: number | string;
  credit?: number | string;
  psakRef?: string;
  notes?: string;
};

export type JournalBalance = {
  ok: boolean;
  totalDebit: number;
  totalCredit: number;
  error?: string;
};

export type CoaAccount = {
  accountCode: string;
  accountName: string;
  note?: string;
};

/**
 * Ekstrak daftar akun standar terpetakan dari ClientProfile.coaMapping.
 * Format: { "kodeKlien": { accountCode, accountName, note? } } → unik per accountCode, urut abjad.
 */
export function coaAccountsFromMapping(mapping: unknown): CoaAccount[] {
  if (!mapping || typeof mapping !== "object") return [];
  const out: CoaAccount[] = [];
  for (const value of Object.values(mapping)) {
    const rec = (value ?? {}) as { accountCode?: unknown; accountName?: unknown; note?: unknown };
    if (
      rec &&
      typeof rec.accountCode === "string" &&
      rec.accountCode.trim() !== "" &&
      typeof rec.accountName === "string" &&
      rec.accountName.trim() !== ""
    ) {
      out.push({
        accountCode: rec.accountCode.trim(),
        accountName: rec.accountName.trim(),
        note: typeof rec.note === "string" ? rec.note.trim() : undefined,
      });
    }
  }
  const seen = new Set<string>();
  return out
    .filter((a) => {
      if (seen.has(a.accountCode)) return false;
      seen.add(a.accountCode);
      return true;
    })
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

/**
 * Validasi baris jurnal terhadap COA klien. Kalau COA belum dipetakan (kosong),
 * validasi dilewati (fallback free-text); begitu COA ada, akun asing ditolak.
 */
export function validateLinesAgainstCoa(
  lines: Array<{ accountCode: string }>,
  mapping: unknown,
): { ok: boolean; error?: string } {
  const accounts = coaAccountsFromMapping(mapping);
  if (accounts.length === 0) return { ok: true };
  const codes = new Set(accounts.map((a) => a.accountCode));
  for (const line of lines) {
    if (!codes.has(line.accountCode)) {
      return {
        ok: false,
        error: `Akun ${line.accountCode} tidak ada di COA klien. Pilih akun dari daftar COA yang sudah dipetakan.`,
      };
    }
  }
  return { ok: true };
}

/**
 * Validasi keseimbangan jurnal (murni, tanpa DB) — total debit harus = total kredit.
 * Aturan per baris: debit ATAU kredit (tidak keduanya, tidak kosong), nilai ≥ 0.
 */
export function journalIsBalanced(lines: ManualLineInput[]): JournalBalance {
  if (!Array.isArray(lines) || lines.length < 2) {
    return { ok: false, totalDebit: 0, totalCredit: 0, error: "Minimal 2 baris jurnal." };
  }
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    const d = Number(line.debit ?? 0) || 0;
    const c = Number(line.credit ?? 0) || 0;
    if (d < 0 || c < 0) {
      return {
        ok: false,
        totalDebit,
        totalCredit,
        error: `Baris akun ${line.accountCode}: nilai tidak boleh negatif.`,
      };
    }
    if (d > 0 && c > 0) {
      return {
        ok: false,
        totalDebit,
        totalCredit,
        error: `Baris akun ${line.accountCode}: debit dan kredit tidak boleh terisi bersamaan.`,
      };
    }
    if (d === 0 && c === 0) {
      return {
        ok: false,
        totalDebit,
        totalCredit,
        error: `Baris akun ${line.accountCode}: debit atau kredit wajib diisi.`,
      };
    }
    totalDebit += d;
    totalCredit += c;
  }
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    return {
      ok: false,
      totalDebit,
      totalCredit,
      error: "Total debit harus sama dengan total kredit.",
    };
  }
  return { ok: true, totalDebit, totalCredit };
}

/**
 * Validasi input jurnal manual dari request (murni, tanpa DB).
 */
export function validateManualJournalInput(body: {
  clientId?: unknown;
  entryDate?: unknown;
  description?: unknown;
  lines?: unknown;
}): { ok: true; clientId: string; entryDate: Date; description: string; lines: ManualLineInput[] } | { ok: false; error: string } {
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  if (!clientId) return { ok: false, error: "Klien wajib dipilih." };

  const rawDate = typeof body.entryDate === "string" ? body.entryDate : "";
  const entryDate = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(entryDate.getTime())) return { ok: false, error: "Tanggal jurnal tidak valid." };

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return { ok: false, error: "Deskripsi jurnal wajib diisi." };

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return { ok: false, error: "Baris jurnal wajib diisi." };
  }
  const lines: ManualLineInput[] = body.lines.map((l) => {
    const line = (l ?? {}) as Record<string, unknown>;
    return {
      accountCode: String(line.accountCode ?? "").trim(),
      accountName: String(line.accountName ?? "").trim(),
      debit: line.debit === undefined ? 0 : Number(line.debit),
      credit: line.credit === undefined ? 0 : Number(line.credit),
      psakRef: line.psakRef ? String(line.psakRef).trim() : undefined,
      notes: line.notes ? String(line.notes).trim() : undefined,
    };
  });
  for (const line of lines) {
    if (!line.accountCode || !line.accountName) {
      return { ok: false, error: "Kode dan nama akun wajib diisi di setiap baris." };
    }
    if (Number.isNaN(Number(line.debit)) || Number.isNaN(Number(line.credit))) {
      return { ok: false, error: `Nilai baris akun ${line.accountCode} tidak valid.` };
    }
  }
  return { ok: true, clientId, entryDate, description, lines };
}

/**
 * Buat jurnal manual/penyesuaian. Langsung berstatus APPROVED karena dibuat oleh
 * manusia (bukan pipeline AI) — tanpa task review. Tetap tercatat di ActivityLog.
 */
export async function createManualJournal(params: {
  firmId: string;
  clientId: string;
  entryDate: Date;
  description: string;
  lines: ManualLineInput[];
  createdBy: string;
  journalType?: JournalType;
}) {
  const { firmId, clientId, entryDate, description, lines, createdBy, journalType = JournalType.MANUAL } = params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, firmId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (!client) {
    throw new ManualJournalError("Klien tidak ditemukan atau tidak aktif.", 400);
  }

  const balance = journalIsBalanced(lines);
  if (!balance.ok) {
    throw new ManualJournalError(balance.error ?? "Jurnal tidak seimbang.", 400);
  }

  // COA klien sebagai sumber kebenaran: akun di luar mapping ditolak (jika mapping ada).
  const profile = await prisma.clientProfile.findUnique({
    where: { clientId: client.id },
    select: { coaMapping: true },
  });
  const coaCheck = validateLinesAgainstCoa(lines, profile?.coaMapping);
  if (!coaCheck.ok) {
    throw new ManualJournalError(coaCheck.error ?? "Akun tidak valid.", 400);
  }

  const journal = await prisma.journalEntry.create({
    data: {
      firmId,
      clientId: client.id,
      description,
      status: "APPROVED",
      createdByAi: false,
      journalType,
      entryDate,
      confidence: null,
      lines: {
        create: lines.map((l) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          debit: new Prisma.Decimal(l.debit ?? 0),
          credit: new Prisma.Decimal(l.credit ?? 0),
          psakRef: l.psakRef ?? null,
          notes: l.notes ?? null,
        })),
      },
      activities: {
        create: {
          firmId,
          userId: createdBy,
          action: "JOURNAL_CREATED",
          detail: { journalType, source: "manual", balance },
        },
      },
    },
    include: { lines: true },
  });

  return journal;
}

/** Daftar jurnal non-AI (manual + penyesuaian) per firma, opsional filter klien & rentang tanggal. */
export async function listManualJournals(params: {
  firmId: string;
  clientId?: string;
  from?: Date;
  to?: Date;
}) {
  const { firmId, clientId, from, to } = params;
  const where: Prisma.JournalEntryWhereInput = {
    firmId,
    journalType: { in: [JournalType.MANUAL, JournalType.ADJUSTING] },
  };
  if (clientId) where.clientId = clientId;
  if (from || to) {
    where.entryDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  return prisma.journalEntry.findMany({
    where,
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    include: { client: { select: { id: true, name: true } }, lines: true },
    take: 200,
  });
}
