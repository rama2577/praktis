import { prisma } from "@/lib/db";
import { emit } from "@/lib/events";
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
  const slaStatus = computeFinalSlaStatus(actualMinutes, target);
  await prisma.slaEvent.create({
    data: {
      firmId: ctx.firmId,
      journalEntryId: entry.id,
      stage: task.stage,
      targetMinutes: target,
      actualMinutes: Math.round(actualMinutes),
      status: slaStatus,
    },
  });

  // Alert in-app saat SLA breach
  if (slaStatus === "BREACHED") {
    await prisma.activityLog.create({
      data: {
        firmId: ctx.firmId,
        journalEntryId: entry.id,
        action: "SLA_BREACHED",
        detail: {
          stage: task.stage,
          targetMinutes: target,
          actualMinutes: Math.round(actualMinutes),
        },
      },
    });
    emit("slaBreach", {
      firmId: ctx.firmId,
      stage: task.stage,
      journalId: entry.id,
      actualMinutes: Math.round(actualMinutes),
    });
  }

  // Update status jurnal
  await prisma.journalEntry.update({
    where: { id: entry.id },
    data: { status: to },
  });

  // EN-05: event domain — dasar untuk notifikasi/webhook (F2: outbox)
  if (to === "APPROVED") {
    emit("journalApproved", {
      journalId: entry.id,
      firmId: ctx.firmId,
      clientId: entry.clientId,
      description: entry.description,
    });
  } else if (to === "EXCEPTION") {
    emit("journalException", {
      journalId: entry.id,
      firmId: ctx.firmId,
      clientId: entry.clientId,
      flag: entry.exceptionFlag,
    });
  }

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

/**
 * Resolusi exception (fungsi terpusat, jalur satu-satunya): EXCEPTION →
 * JUNIOR_REVIEW + task JUNIOR baru + ActivityLog EXCEPTION_RESOLVED.
 */
export async function resolveException({
  firmId,
  journalId,
  actor,
  note,
}: {
  firmId: string;
  journalId: string;
  actor: User;
  note: string;
}) {
  const entry = await prisma.journalEntry.findUnique({ where: { id: journalId } });
  if (!entry || entry.firmId !== firmId) throw new Error("Jurnal tidak ditemukan");
  if (!canTransition(entry.status, "JUNIOR_REVIEW")) {
    throw new Error(`Jurnal berstatus ${entry.status} tidak bisa diresolusi`);
  }

  const now = new Date();
  await prisma.journalEntry.update({
    where: { id: journalId },
    data: { status: "JUNIOR_REVIEW" },
  });

  const assigneeId = await pickAssignee(firmId, "JUNIOR");
  await prisma.reviewTask.create({
    data: {
      journalEntryId: journalId,
      stage: "JUNIOR",
      assigneeId,
      dueAt: new Date(now.getTime() + SLA_TARGETS_MIN.JUNIOR * 60_000),
    },
  });

  await prisma.activityLog.create({
    data: {
      firmId,
      userId: actor.id,
      journalEntryId: journalId,
      action: "EXCEPTION_RESOLVED",
      detail: { note, from: "EXCEPTION", to: "JUNIOR_REVIEW" },
    },
  });

  return { journalId, from: "EXCEPTION" as const, to: "JUNIOR_REVIEW" as const };
}
