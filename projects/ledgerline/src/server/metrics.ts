import { prisma } from "@/lib/db";
import type { JournalStatus, ReviewStage } from "@prisma/client";

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
