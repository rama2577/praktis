import { prisma } from "@/lib/db";
import type { JournalStatus, ReviewStage, SlaEvent } from "@prisma/client";

/** Ringkasan SLA yang dipilih untuk metrik. */
type SlaKey = Pick<SlaEvent, "stage" | "status" | "journalEntryId">;

// ── Pure helpers (unit-testable) ─────────────────────────────────────────

/** Persentase (0–100, 1 desimal); 0 jika total ≤ 0. */
export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** Rata-rata (0–1, 4 desimal); null jika tidak ada data. */
export function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10_000) / 10_000;
}

// ── Tipe hasil ───────────────────────────────────────────────────────────

export type StatusConfidence = {
  status: JournalStatus;
  count: number;
  avgConfidence: number | null;
};

export type StageBreachRate = {
  stage: ReviewStage;
  total: number;
  breached: number;
  rate: number; // 0–100
};

export type ExceptionItem = {
  id: string;
  clientName: string;
  description: string | null;
  exceptionFlag: string | null;
  confidence: number | null;
  createdAt: string;
};

export type QualityMetrics = {
  totalJournals: number;
  approvedCount: number;
  rejectedCount: number;
  exceptionCount: number;
  firstPassRate: number; // % task review selesai tanpa reject/return
  exceptionRate: number; // % jurnal dengan exceptionFlag
  avgConfidenceAll: number | null;
  statusConfidence: StatusConfidence[];
  stageBreachRates: StageBreachRate[];
  exceptions: ExceptionItem[];
};

// ── Agregasi dari DB ─────────────────────────────────────────────────────

export async function getQualityMetrics(firmId: string): Promise<QualityMetrics> {
  const [journals, tasks, slaByStage, exceptions] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { firmId },
      select: { status: true, confidence: true, exceptionFlag: true },
    }),
    prisma.reviewTask.findMany({
      where: { status: { not: "PENDING" }, journalEntry: { firmId } },
      select: { status: true },
    }),
    prisma.slaEvent.groupBy({
      by: ["stage", "status"],
      where: { firmId },
      _count: true,
    }),
    prisma.journalEntry.findMany({
      where: { firmId, status: "EXCEPTION" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        description: true,
        exceptionFlag: true,
        confidence: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  const totalJournals = journals.length;
  const approvedCount = journals.filter((j) => j.status === "APPROVED").length;
  const rejectedCount = journals.filter((j) => j.status === "REJECTED").length;
  const exceptionCount = journals.filter((j) => j.status === "EXCEPTION").length;
  const exceptionFlagCount = journals.filter((j) => j.exceptionFlag !== null).length;

  const doneTasks = tasks.length;
  const rejectedTasks = tasks.filter((t) => t.status === "REJECTED").length;

  const statusOrder: JournalStatus[] = ["APPROVED", "PARTNER_APPROVAL", "TAX_REVIEW", "SENIOR_REVIEW", "JUNIOR_REVIEW", "DRAFT", "EXCEPTION", "REJECTED"];
  const statusConfidence: StatusConfidence[] = statusOrder
    .map((status) => {
      const rows = journals.filter((j) => j.status === status);
      return {
        status,
        count: rows.length,
        avgConfidence: avg(rows.map((r) => r.confidence).filter((c): c is number => c !== null)),
      };
    })
    .filter((s) => s.count > 0);

  const stageOrder: ReviewStage[] = ["JUNIOR", "SENIOR", "TAX", "PARTNER"];
  const stageBreachRates: StageBreachRate[] = stageOrder.map((stage) => {
    const total = slaByStage.filter((s) => s.stage === stage).reduce((a, s) => a + s._count, 0);
    const breached = slaByStage.find((s) => s.stage === stage && s.status === "BREACHED")?._count ?? 0;
    return { stage, total, breached, rate: pct(breached, total) };
  });

  return {
    totalJournals,
    approvedCount,
    rejectedCount,
    exceptionCount,
    firstPassRate: pct(doneTasks - rejectedTasks, doneTasks),
    exceptionRate: pct(exceptionFlagCount, totalJournals),
    avgConfidenceAll: avg(journals.map((j) => j.confidence).filter((c): c is number => c !== null)),
    statusConfidence,
    stageBreachRates,
    exceptions: exceptions.map((e) => ({
      id: e.id,
      clientName: e.client.name,
      description: e.description,
      exceptionFlag: e.exceptionFlag,
      confidence: e.confidence,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

// ══════════ EN-10 — Metrik per clerk & per firma ══════════

const STAGE_LABEL: Record<ReviewStage, string> = {
  JUNIOR: "Junior",
  SENIOR: "Senior",
  TAX: "Pajak",
  PARTNER: "Partner",
};

/** Rata-rata menit dari durasi; null jika tidak ada data. */
export function avgMinutes(minutes: number[]): number | null {
  if (minutes.length === 0) return null;
  return Math.round((minutes.reduce((a, b) => a + b, 0) / minutes.length) * 10) / 10;
}

export type ClerkMetric = {
  userId: string;
  name: string;
  email: string;
  role: ReviewStage | "ADMIN";
  totalReviews: number;
  approved: number;
  rejected: number;
  returned: number;
  avgMinutes: number | null;
  slaMet: number;
  slaBreached: number;
  slaRate: number; // 0–100
};

export type FirmMetric = {
  totalTasks: number;
  totalApproved: number;
  avgReviewMinutes: number | null;
  avgSlaRate: number | null;
  perStage: Array<{
    stage: ReviewStage;
    label: string;
    total: number;
    avgMinutes: number | null;
    slaRate: number;
  }>;
};

/**
 * Metrik per clerk — siapa yang cepat/lambat, banyak tolak, breach SLA.
 */
export async function getClerkMetrics(firmId: string): Promise<ClerkMetric[]> {
  const [users, tasks, slaEvents] = await Promise.all([
    prisma.user.findMany({
      where: { firmId, role: { in: ["JUNIOR", "SENIOR", "TAX", "PARTNER", "ADMIN"] } },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.reviewTask.findMany({
      where: { status: { not: "PENDING" }, journalEntry: { firmId } },
      select: { id: true, assigneeId: true, journalEntryId: true, stage: true, status: true, reviewedAt: true, createdAt: true, note: true },
    }),
    prisma.slaEvent.findMany({
      where: { firmId },
      select: { stage: true, status: true, journalEntryId: true },
    }),
  ]);

  const slaByKey = new Map<string, SlaKey>();
  for (const s of slaEvents) {
    if (s.journalEntryId) slaByKey.set(`${s.journalEntryId}:${s.stage}`, s);
  }

  return users
    .map((user): ClerkMetric => {
      const myTasks = tasks.filter((t) => t.assigneeId === user.id);
      const durations = myTasks
        .map((t) => {
          if (!t.reviewedAt) return null;
          return (t.reviewedAt.getTime() - t.createdAt.getTime()) / 60_000;
        })
        .filter((d): d is number => d !== null);

      const slaMine = myTasks.map((t) => slaByKey.get(`${t.journalEntryId}:${t.stage}`)).filter(Boolean);
      const slaMet = slaMine.filter((s) => s!.status === "MET").length;
      const slaBreached = slaMine.filter((s) => s!.status === "BREACHED").length;

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role as ClerkMetric["role"],
        totalReviews: myTasks.length,
        approved: myTasks.filter((t) => t.status === "APPROVED").length,
        rejected: myTasks.filter((t) => t.status === "REJECTED").length,
        returned: myTasks.filter((t) => t.note !== null && t.status === "APPROVED").length,
        avgMinutes: avgMinutes(durations),
        slaMet,
        slaBreached,
        slaRate: pct(slaMet, slaMine.length),
      };
    })
    .filter((c) => c.totalReviews > 0 || c.slaBreached > 0)
    .sort((a, b) => b.totalReviews - a.totalReviews);
}

/** Metrik agregat firma — ringkasan performa tim. */
export async function getFirmMetrics(firmId: string): Promise<FirmMetric> {
  const [tasks, slaEvents] = await Promise.all([
    prisma.reviewTask.findMany({
      where: { status: { not: "PENDING" }, journalEntry: { firmId } },
      select: { id: true, journalEntryId: true, stage: true, status: true, reviewedAt: true, createdAt: true },
    }),
    prisma.slaEvent.findMany({
      where: { firmId },
      select: { stage: true, status: true, journalEntryId: true },
    }),
  ]);

  const slaByKey = new Map<string, SlaKey>();
  for (const s of slaEvents) {
    if (s.journalEntryId) slaByKey.set(`${s.journalEntryId}:${s.stage}`, s);
  }

  const allDurations = tasks
    .map((t) => {
      if (!t.reviewedAt) return null;
      return (t.reviewedAt.getTime() - t.createdAt.getTime()) / 60_000;
    })
    .filter((d): d is number => d !== null);

  const stageOrder: ReviewStage[] = ["JUNIOR", "SENIOR", "TAX", "PARTNER"];
  const perStage = stageOrder.map((stage) => {
    const stageTasks = tasks.filter((t) => t.stage === stage);
    const durations = stageTasks
      .map((t) => {
        if (!t.reviewedAt) return null;
        return (t.reviewedAt.getTime() - t.createdAt.getTime()) / 60_000;
      })
      .filter((d): d is number => d !== null);
    const sla = stageTasks.map((t) => slaByKey.get(`${t.journalEntryId}:${t.stage}`)).filter(Boolean);
    const met = sla.filter((s) => s!.status === "MET").length;
    return {
      stage,
      label: STAGE_LABEL[stage],
      total: stageTasks.length,
      avgMinutes: avgMinutes(durations),
      slaRate: pct(met, sla.length),
    };
  });

  const allSla = [...slaByKey.values()];
  const allMet = allSla.filter((s) => s.status === "MET").length;

  return {
    totalTasks: tasks.length,
    totalApproved: tasks.filter((t) => t.status === "APPROVED").length,
    avgReviewMinutes: avgMinutes(allDurations),
    avgSlaRate: allSla.length > 0 ? pct(allMet, allSla.length) : null,
    perStage,
  };
}

export { STAGE_LABEL };
