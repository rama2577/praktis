import { prisma } from "@/lib/db";
import type { DocumentStatus, JournalStatus, ReviewStage } from "@prisma/client";

/** Status jurnal yang sedang "dalam proses" (belum final). */
export const IN_PROCESS_STATUSES: JournalStatus[] = [
  "DRAFT",
  "EXCEPTION",
  "JUNIOR_REVIEW",
  "SENIOR_REVIEW",
  "TAX_REVIEW",
  "PARTNER_APPROVAL",
];

// ── Pure helpers (unit-testable) ─────────────────────────────────────────

/** Persentase jurnal yang dibuat AI (0–100, 1 desimal). */
export function automationPct(aiTotal: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((aiTotal / total) * 1000) / 10;
}

/** Persentase jurnal AI yang lolos tanpa pengecualian (0–100, 1 desimal). */
export function successfulAutomationPct(aiWithoutException: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((aiWithoutException / total) * 1000) / 10;
}

/** Selisih persentase today vs rata-rata harian; null jika baseline tidak tersedia. */
export function deltaVsAverage(today: number, avgDaily: number): number | null {
  if (avgDaily <= 0) return null;
  return Math.round(((today - avgDaily) / avgDaily) * 1000) / 10;
}

/** Jumlah hari sejak tanggal pertama (minimal 1). */
export function daysSince(from: Date, now: Date): number {
  const diff = now.getTime() - from.getTime();
  if (diff <= 0) return 1;
  return Math.max(1, Math.ceil(diff / 86_400_000));
}

/** Dokumen yang sedang diproses pipeline AI (belum selesai). */
export const PROCESSING_DOC_STATUSES: DocumentStatus[] = ["PENDING", "PROCESSING"];

// ── Pipeline & antrian: pure builders (unit-testable) ────────────────────

export type PipelineStageData = {
  key: "draft" | "ruleEngine" | "junior" | "senior" | "tax";
  label: string;
  count: number;
  hint: string;
};

export type QueueSummaryItem = {
  stage: ReviewStage;
  pending: number;
  urgent: number;
};

export type PipelineData = {
  stages: PipelineStageData[];
  queues: QueueSummaryItem[];
  totalInPipeline: number;
};

/** Susun 5 stage pipeline dari hitungan status jurnal + dokumen diproses. */
export function buildPipelineStages(
  statusCounts: Array<{ status: JournalStatus; count: number }>,
  docsProcessing: number,
): PipelineStageData[] {
  const by = new Map(statusCounts.map((s) => [s.status, s.count]));
  const draft = by.get("DRAFT") ?? 0;
  const junior = by.get("JUNIOR_REVIEW") ?? 0;
  const senior = by.get("SENIOR_REVIEW") ?? 0;
  const tax = by.get("TAX_REVIEW") ?? 0;
  const partner = by.get("PARTNER_APPROVAL") ?? 0;
  return [
    { key: "draft", label: "Draft Jurnal", count: draft, hint: "hasil AI menunggu masuk antrian" },
    { key: "ruleEngine", label: "Rule Engine", count: docsProcessing, hint: "dokumen sedang diproses AI" },
    { key: "junior", label: "Review Junior", count: junior, hint: "verifikasi awal" },
    { key: "senior", label: "Review Senior", count: senior, hint: "pemeriksaan lanjutan" },
    { key: "tax", label: "Review Pajak", count: tax + partner, hint: "tax & persetujuan partner" },
  ];
}

/** Ringkas task pending per stage: jumlah total + jumlah urgent. */
export function buildQueueSummary(
  tasks: Array<{ stage: ReviewStage; urgent: boolean }>,
): QueueSummaryItem[] {
  const map = new Map<ReviewStage, { pending: number; urgent: number }>();
  for (const t of tasks) {
    const cur = map.get(t.stage) ?? { pending: 0, urgent: 0 };
    cur.pending += 1;
    if (t.urgent) cur.urgent += 1;
    map.set(t.stage, cur);
  }
  const order: ReviewStage[] = ["JUNIOR", "SENIOR", "TAX", "PARTNER"];
  return order
    .filter((s) => map.has(s))
    .map((s) => ({ stage: s, pending: map.get(s)!.pending, urgent: map.get(s)!.urgent }));
}

export async function getPipelineData(firmId: string): Promise<PipelineData> {
  const [statusCounts, docsProcessing, tasks] = await Promise.all([
    prisma.journalEntry.groupBy({ by: ["status"], where: { firmId }, _count: true }),
    prisma.document.count({ where: { firmId, status: { in: PROCESSING_DOC_STATUSES } } }),
    prisma.reviewTask.findMany({
      where: { status: "PENDING", journalEntry: { firmId } },
      select: { stage: true, urgent: true },
    }),
  ]);

  const stages = buildPipelineStages(
    statusCounts.map((s) => ({ status: s.status as JournalStatus, count: s._count })),
    docsProcessing,
  );
  const queues = buildQueueSummary(tasks.map((t) => ({ stage: t.stage as ReviewStage, urgent: t.urgent })));
  return {
    stages,
    queues,
    totalInPipeline: stages.reduce((acc, s) => acc + s.count, 0),
  };
}

// ── Agregasi data dashboard dari DB ──────────────────────────────────────

export type DashboardData = {
  activeClients: number;
  newClientsThisMonth: number;
  aiAutomationPct: number;
  jobsInProgress: number;
  aiDraftJobs: number;
  reviewJobs: number;
  transactionsToday: number;
  avgDailyTransactions: number;
  transactionsDeltaPct: number | null;
  slaBreachCount: number;
  breachesByStage: Array<{ stage: ReviewStage; count: number }>;
};

export async function getDashboardData(firmId: string): Promise<DashboardData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [activeClients, newClientsThisMonth, statusCounts, aiWithoutException, pendingReviews, todayJournals, slaBreachCount, breachesByStage, minCreated] =
    await Promise.all([
      prisma.client.count({ where: { firmId, status: "ACTIVE" } }),
      prisma.client.count({ where: { firmId, createdAt: { gte: startOfMonth } } }),
      prisma.journalEntry.groupBy({ by: ["status"], where: { firmId }, _count: true }),
      prisma.journalEntry.count({ where: { firmId, createdByAi: true, exceptionFlag: null } }),
      prisma.reviewTask.count({ where: { status: "PENDING", journalEntry: { firmId } } }),
      prisma.journalEntry.count({ where: { firmId, createdAt: { gte: startOfToday } } }),
      prisma.slaEvent.count({ where: { firmId, status: "BREACHED" } }),
      prisma.slaEvent.groupBy({ by: ["stage"], where: { firmId, status: "BREACHED" }, _count: true }),
      prisma.journalEntry.aggregate({ where: { firmId }, _min: { createdAt: true } }),
    ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const totalJournals = statusCounts.reduce((acc, s) => acc + s._count, 0);
  const aiDraftJobs = byStatus["DRAFT"] ?? 0;
  const jobsInProgress = IN_PROCESS_STATUSES.reduce((acc, s) => acc + (byStatus[s] ?? 0), 0);

  const days = minCreated._min.createdAt ? daysSince(minCreated._min.createdAt, now) : 1;
  const avgDailyTransactions = Math.round((totalJournals / days) * 10) / 10;

  return {
    activeClients,
    newClientsThisMonth,
    aiAutomationPct: successfulAutomationPct(aiWithoutException, totalJournals),
    jobsInProgress,
    aiDraftJobs,
    reviewJobs: pendingReviews,
    transactionsToday: todayJournals,
    avgDailyTransactions,
    transactionsDeltaPct: deltaVsAverage(todayJournals, avgDailyTransactions),
    slaBreachCount,
    breachesByStage: breachesByStage
      .map((b) => ({ stage: b.stage as ReviewStage, count: b._count }))
      .sort((a, b) => b.count - a.count),
  };
}
