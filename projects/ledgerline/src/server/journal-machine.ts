import { prisma } from "@/lib/db";
import { SLA_TARGETS_MIN, computeFinalSlaStatus } from "@/server/sla";
import type { JournalStatus, ReviewStage, ReviewTask, Role, User } from "@prisma/client";

// ── Definisi state machine (pure, bisa diuji) ────────────────────────────

/**
 * Transisi valid. Kunci utama = status jurnal; nilai = status tujuan.
 * DRAFT → JUNIOR_REVIEW adalah "masuk pipeline"; RETURN = kembali ke stage
 * sebelumnya; EXCEPTION → JUNIOR_REVIEW = perbaikan setelah flag.
 */
export const JOURNAL_TRANSITIONS: Record<JournalStatus, JournalStatus[]> = {
  DRAFT: ["JUNIOR_REVIEW", "EXCEPTION", "ARCHIVED"],
  JUNIOR_REVIEW: ["SENIOR_REVIEW", "DRAFT", "REJECTED", "EXCEPTION", "ARCHIVED"],
  SENIOR_REVIEW: ["TAX_REVIEW", "JUNIOR_REVIEW", "REJECTED", "EXCEPTION", "ARCHIVED"],
  TAX_REVIEW: ["PARTNER_APPROVAL", "SENIOR_REVIEW", "REJECTED", "EXCEPTION", "ARCHIVED"],
  PARTNER_APPROVAL: ["APPROVED", "TAX_REVIEW", "REJECTED", "EXCEPTION", "ARCHIVED"],
  EXCEPTION: ["JUNIOR_REVIEW", "REJECTED", "ARCHIVED"],
  APPROVED: ["ARCHIVED"],
  REJECTED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: JournalStatus, to: JournalStatus): boolean {
  return JOURNAL_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Stage review untuk sebuah status jurnal (null jika bukan stage review). */
export function reviewStageForStatus(status: JournalStatus): ReviewStage | null {
  switch (status) {
    case "JUNIOR_REVIEW":
      return "JUNIOR";
    case "SENIOR_REVIEW":
      return "SENIOR";
    case "TAX_REVIEW":
      return "TAX";
    case "PARTNER_APPROVAL":
      return "PARTNER";
    default:
      return null;
  }
}

export const REVIEW_STAGE_BY_ROLE: Record<ReviewStage, Role> = {
  JUNIOR: "JUNIOR",
  SENIOR: "SENIOR",
  TAX: "TAX",
  PARTNER: "PARTNER",
};

// ── Aksi transisi (server) ───────────────────────────────────────────────

export type ReviewAction = "approve" | "reject" | "return";

type TransitionCtx = {
  firmId: string;
  actor: User;
  task: ReviewTask;
  note?: string | null;
};

/**
 * Eksekusi transisi terpusat: validasi → update status jurnal → selesaikan
 * task saat ini → buat task stage berikutnya (jika ada) → ActivityLog.
 * Semua jalur approve/reject/return WAJIB lewat fungsi ini.
 */
export async function transitionJournal(to: JournalStatus, action: ReviewAction, ctx: TransitionCtx) {
  const { task } = ctx;
  const entry = await prisma.journalEntry.findUnique({
    where: { id: task.journalEntryId },
  });
  if (!entry) throw new Error("Jurnal tidak ditemukan");

  if (!canTransition(entry.status, to)) {
    throw new Error(`Transisi tidak valid: ${entry.status} → ${to}`);
  }

  const now = new Date();

  // Selesaikan task saat ini
  const taskStatus = to === "REJECTED" ? "REJECTED" : "APPROVED";
  await prisma.reviewTask.update({
    where: { id: task.id },
    data: { status: taskStatus, reviewedAt: now, note: ctx.note },
  });

  // SLA final untuk task yang diselesaikan
  const target = SLA_TARGETS_MIN[task.stage];
  const actualMinutes = (now.getTime() - task.createdAt.getTime()) / 60_000;
  await prisma.slaEvent.create({
    data: {
      firmId: ctx.firmId,
      journalEntryId: entry.id,
      stage: task.stage,
      targetMinutes: target,
      actualMinutes: Math.round(actualMinutes),
      status: computeFinalSlaStatus(actualMinutes, target),
    },
  });

  // Update status jurnal
  await prisma.journalEntry.update({
    where: { id: entry.id },
    data: { status: to },
  });

  // Buat task stage berikutnya
  const nextStage = reviewStageForStatus(to);
  if (nextStage) {
    const assigneeId = await pickAssignee(ctx.firmId, nextStage);
    await prisma.reviewTask.create({
      data: {
        journalEntryId: entry.id,
        stage: nextStage,
        assigneeId,
        dueAt: new Date(now.getTime() + SLA_TARGETS_MIN[nextStage] * 60_000),
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      firmId: ctx.firmId,
      userId: ctx.actor.id,
      journalEntryId: entry.id,
      action: action === "reject" ? "REVIEW_REJECTED" : action === "approve" ? "REVIEW_APPROVED" : "REVIEW_RETURNED",
      detail: {
        from: entry.status,
        to,
        taskId: task.id,
        stage: task.stage,
        note: ctx.note,
      },
    },
  });

  return { entryId: entry.id, from: entry.status, to };
}

/** Status tujuan untuk aksi review pada stage tertentu. */
export function nextStatusForAction(stage: ReviewStage, action: ReviewAction): JournalStatus {
  switch (action) {
    case "approve":
      return stage === "JUNIOR" ? "SENIOR_REVIEW" : stage === "SENIOR" ? "TAX_REVIEW" : stage === "TAX" ? "PARTNER_APPROVAL" : "APPROVED";
    case "reject":
      return "REJECTED";
    case "return":
      return stage === "JUNIOR" ? "DRAFT" : stage === "SENIOR" ? "JUNIOR_REVIEW" : stage === "TAX" ? "SENIOR_REVIEW" : "TAX_REVIEW";
  }
}

/**
 * Pilih assignee untuk stage: user dengan role stage yang punya paling
 * sedikit task pending (load balancing sederhana); null jika tidak ada.
 */
export async function pickAssignee(firmId: string, stage: ReviewStage): Promise<string | null> {
  const role = REVIEW_STAGE_BY_ROLE[stage];
  const candidates = await prisma.user.findMany({
    where: { firmId, role, active: true },
    include: { _count: { select: { reviewTasks: { where: { status: "PENDING" } } } } },
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a._count.reviewTasks - b._count.reviewTasks);
  return candidates[0].id;
}
