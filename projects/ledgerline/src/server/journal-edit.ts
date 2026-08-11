import { Prisma, type JournalLine, type ReviewTask, type User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { journalIsBalanced, type ManualLineInput } from "@/server/manual-journal";

export class JournalEditError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Field baris jurnal yang bisa dikoreksi reviewer. */
export type CorrectionField = "accountCode" | "accountName" | "debit" | "credit" | "notes";

export type EditLineInput = {
  id?: string; // id baris lama — kosong untuk baris baru
  accountCode: string;
  accountName: string;
  debit?: number | string;
  credit?: number | string;
  psakRef?: string;
  notes?: string;
};

export type CorrectionRecord = {
  field: CorrectionField;
  accountCode: string;
  before: unknown;
  after: unknown;
};

/**
 * Diff dua set baris jurnal (murni, tanpa DB). Baris baru (tanpa id) dianggap
 * field kosong → terisi; baris yang tidak ada di input dianggap terhapus
 * (field "notes" sebelum terisi → null). Dipakai untuk JournalCorrection +
 * ActivityLog JOURNAL_EDITED.
 */
export function computeCorrections(existing: JournalLine[], incoming: EditLineInput[]): CorrectionRecord[] {
  const corrections: CorrectionRecord[] = [];

  const norm = (v: Prisma.Decimal | number | string | null | undefined): string => {
    if (v === null || v === undefined) return "";
    if (v instanceof Prisma.Decimal) return v.toString();
    if (typeof v === "number") return new Prisma.Decimal(v).toString();
    const s = String(v).trim();
    if (s === "") return "";
    const n = Number(s);
    if (!Number.isFinite(n)) return s;
    return new Prisma.Decimal(n).toString(); // kanonik: "1250.00" → "1250", "0.00" → "0"
  };

  const existingByLineId = new Map(existing.map((l) => [l.id, l]));
  const incomingLineIds = new Set(incoming.filter((l) => l.id).map((l) => l.id as string));

  const push = (field: CorrectionField, accountCode: string, before: unknown, after: unknown) => {
    // Normalisasi angka agar "0" vs 0 vs "0.00" tidak dianggap berubah
    const b = field === "debit" || field === "credit" ? norm(before as Prisma.Decimal | number | string | null) : before;
    const a = field === "debit" || field === "credit" ? norm(after as Prisma.Decimal | number | string | null) : after;
    if (b === a) return;
    corrections.push({ field, accountCode, before: field === "debit" || field === "credit" ? b : (b ?? null), after: field === "debit" || field === "credit" ? a : (a ?? null) });
  };

  for (const line of incoming) {
    const accountCode = line.accountCode.trim();
    if (line.id && existingByLineId.has(line.id)) {
      const old = existingByLineId.get(line.id)!;
      push("accountCode", accountCode, old.accountCode, line.accountCode.trim());
      push("accountName", accountCode, old.accountName, line.accountName.trim());
      push("debit", accountCode, old.debit, line.debit ?? 0);
      push("credit", accountCode, old.credit, line.credit ?? 0);
      push("notes", accountCode, old.notes, line.notes?.trim() || null);
    } else {
      // Baris baru — seluruh field tercatat sebagai koreksi dari kosong
      push("accountCode", accountCode, "", line.accountCode.trim());
      push("accountName", accountCode, "", line.accountName.trim());
      push("debit", accountCode, "0", line.debit ?? 0);
      push("credit", accountCode, "0", line.credit ?? 0);
      push("notes", accountCode, null, line.notes?.trim() || null);
    }
  }

  // Baris yang dihapus reviewer (ada di DB, tidak ada di input)
  for (const old of existing) {
    if (incomingLineIds.has(old.id)) continue;
    push("notes", old.accountCode, old.notes, null);
    push("accountCode", old.accountCode, old.accountCode, "");
    push("accountName", old.accountName, old.accountName, "");
    push("debit", old.accountCode, old.debit, "0");
    push("credit", old.accountCode, old.credit, "0");
  }

  return corrections;
}

/**
 * Validasi input edit baris jurnal (murni): aturan sama dengan jurnal manual —
 * minimal 2 baris, tidak negatif, tidak debit+kredit bersamaan, total seimbang.
 * PENTING: field `id` baris lama DIPERTAHANKAN agar diff (computeCorrections)
 * membandingkan baris yang sama, bukan "hapus semua + buat semua".
 */
export function validateEditLines(body: { lines?: unknown }): { ok: true; lines: EditLineInput[] } | { ok: false; error: string } {
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return { ok: false, error: "Baris jurnal wajib diisi." };
  }
  const lines: EditLineInput[] = (body.lines as unknown[]).map((l) => {
    const line = (l ?? {}) as Record<string, unknown>;
    return {
      id: typeof line.id === "string" && line.id.trim() ? line.id.trim() : undefined,
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
  const balance = journalIsBalanced(lines);
  if (!balance.ok) {
    return { ok: false, error: balance.error ?? "Jurnal tidak seimbang." };
  }
  return { ok: true, lines };
}

/**
 * Simpan koreksi baris jurnal saat review. Status jurnal & task TIDAK berubah
 * (tetap di stage yang sama — revisi draft, bukan transisi). Setiap perubahan
 * field tercatat ke JournalCorrection (feedback KB/EN-03) + ActivityLog
 * JOURNAL_EDITED berisi diff ringkas.
 */
export async function editJournalLines(params: {
  firmId: string;
  actor: User;
  task: ReviewTask;
  lines: EditLineInput[];
}) {
  const { firmId, actor, task, lines } = params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id: task.journalEntryId, firmId },
    include: { lines: true },
  });
  if (!entry) throw new JournalEditError("Jurnal tidak ditemukan.", 404);

  // Hanya boleh diedit saat masih antre di stage review (belum APPROVED/REJECTED)
  if (!["JUNIOR_REVIEW", "SENIOR_REVIEW", "TAX_REVIEW", "PARTNER_APPROVAL", "EXCEPTION"].includes(entry.status)) {
    throw new JournalEditError(`Jurnal berstatus ${entry.status} tidak bisa diedit.`, 409);
  }

  const balance = journalIsBalanced(lines as ManualLineInput[]);
  if (!balance.ok) {
    throw new JournalEditError(balance.error ?? "Jurnal tidak seimbang.", 400);
  }

  const corrections = computeCorrections(entry.lines, lines);

  const now = new Date();
  const incomingIds = new Set(lines.filter((l) => l.id).map((l) => l.id as string));

  // Baris yang dihapus reviewer → hapus dari DB (baris lain update/insert)
  await prisma.journalLine.deleteMany({
    where: { journalEntryId: entry.id, id: { notIn: [...incomingIds] } },
  });

  for (const line of lines) {
    const data = {
      accountCode: line.accountCode.trim(),
      accountName: line.accountName.trim(),
      debit: new Prisma.Decimal(line.debit ?? 0),
      credit: new Prisma.Decimal(line.credit ?? 0),
      psakRef: line.psakRef?.trim() || null,
      notes: line.notes?.trim() || null,
    };
    if (line.id) {
      await prisma.journalLine.update({ where: { id: line.id }, data });
    } else {
      await prisma.journalLine.create({ data: { ...data, journalEntryId: entry.id } });
    }
  }

  // JournalCorrection — feedback loop KB (EN-03) + insight A6
  if (corrections.length > 0) {
    await prisma.journalCorrection.createMany({
      data: corrections.map((c) => ({
        firmId,
        journalEntryId: entry.id,
        userId: actor.id,
        stage: task.stage,
        field: c.field,
        accountCode: c.accountCode,
        before: c.before as Prisma.InputJsonValue,
        after: c.after as Prisma.InputJsonValue,
      })),
    });
  }

  await prisma.journalEntry.update({
    where: { id: entry.id },
    data: { updatedAt: now },
  });

  await prisma.activityLog.create({
    data: {
      firmId,
      userId: actor.id,
      journalEntryId: entry.id,
      action: "JOURNAL_EDITED",
      detail: {
        stage: task.stage,
        lineCount: lines.length,
        correctionCount: corrections.length,
        corrections: corrections.slice(0, 20),
        balance,
      },
    },
  });

  return { journalId: entry.id, corrections: corrections.length, lines: lines.length };
}
