import { prisma } from "@/lib/db";
import type { JournalStatus, ReviewStage } from "@prisma/client";

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
