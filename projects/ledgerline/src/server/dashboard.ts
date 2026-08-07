import { prisma } from "@/lib/db";
import { SLA_TARGETS_MIN } from "@/server/sla";
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

// ── SLA, confidence & activity ───────────────────────────────────────────

export type SlaStageSummary = {
  stage: ReviewStage;
  targetMinutes: number;
  completed: number;
  met: number;
  breached: number;
  pending: number;
  overdue: number;
  avgPct: number; // rata-rata % target terpakai (selesai: actual/target; pending: elapsed/target)
};

export type ConfidenceBucket = { label: string; count: number };

export type ActivityItem = {
  id: string;
  action: string;
  label: string;
  userName: string | null;
  createdAt: string;
};

export const ACTION_LABELS: Record<string, string> = {
  AI_DRAFT_COMPLETED: "AI membuat draft jurnal",
  PIPELINE_ENQUEUED: "dokumen masuk pipeline",
  PIPELINE_STARTED: "pipeline AI mulai memproses dokumen",
  PIPELINE_FAILED: "pipeline AI gagal memproses dokumen",
  EXCEPTION_FLAGGED: "dokumen ditandai pengecualian",
  REVIEW_APPROVED: "menyetujui jurnal",
  REVIEW_REJECTED: "menolak jurnal",
  REVIEW_RETURNED: "mengembalikan jurnal ke tahap sebelumnya",
  SLA_BREACHED: "melanggar tenggat SLA (alert)",
  EXCEPTION_RESOLVED: "meresolusi exception — jurnal kembali ke pipeline",
  CLIENT_CREATED: "menambahkan klien baru",
  CLIENT_UPDATED: "memperbarui data klien",
  DOCUMENT_UPLOADED: "mengunggah dokumen",
};

/**
 * Ringkas SLA per stage dari event selesai + task pending.
 * Pure & unit-testable. `now` diinjeksi agar deterministik.
 */
export function buildSlaSummary(
  events: Array<{ stage: ReviewStage; status: "MET" | "AT_RISK" | "BREACHED"; actualMinutes: number; targetMinutes: number }>,
  pendingTasks: Array<{ stage: ReviewStage; createdAt: Date; dueAt: Date }>,
  now: Date,
): SlaStageSummary[] {
  const order: ReviewStage[] = ["JUNIOR", "SENIOR", "TAX", "PARTNER"];
  const pcts: Record<ReviewStage, number[]> = {
    JUNIOR: [],
    SENIOR: [],
    TAX: [],
    PARTNER: [],
  };
  const acc: Record<ReviewStage, SlaStageSummary> = {
    JUNIOR: { stage: "JUNIOR", targetMinutes: SLA_TARGETS_MIN.JUNIOR, completed: 0, met: 0, breached: 0, pending: 0, overdue: 0, avgPct: 0 },
    SENIOR: { stage: "SENIOR", targetMinutes: SLA_TARGETS_MIN.SENIOR, completed: 0, met: 0, breached: 0, pending: 0, overdue: 0, avgPct: 0 },
    TAX: { stage: "TAX", targetMinutes: SLA_TARGETS_MIN.TAX, completed: 0, met: 0, breached: 0, pending: 0, overdue: 0, avgPct: 0 },
    PARTNER: { stage: "PARTNER", targetMinutes: SLA_TARGETS_MIN.PARTNER, completed: 0, met: 0, breached: 0, pending: 0, overdue: 0, avgPct: 0 },
  };

  for (const e of events) {
    acc[e.stage].completed += 1;
    if (e.status === "BREACHED") acc[e.stage].breached += 1;
    else acc[e.stage].met += 1;
    pcts[e.stage].push((e.actualMinutes / e.targetMinutes) * 100);
  }
  for (const t of pendingTasks) {
    acc[t.stage].pending += 1;
    if (t.dueAt.getTime() < now.getTime()) acc[t.stage].overdue += 1;
    const targetMs = acc[t.stage].targetMinutes * 60_000;
    const elapsed = Math.max(0, now.getTime() - t.createdAt.getTime());
    pcts[t.stage].push(Math.min(200, (elapsed / targetMs) * 100));
  }
  for (const s of order) {
    const arr = pcts[s];
    acc[s].avgPct = arr.length === 0 ? 0 : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
  }
  return order.map((s) => acc[s]);
}

/** Distribusi keyakinan AI dalam 4 bucket (0–50, 50–70, 70–85, ≥85%). */
export function bucketConfidence(confidences: number[]): ConfidenceBucket[] {
  const buckets = [0, 0, 0, 0];
  for (const c of confidences) {
    if (c < 0.5) buckets[0] += 1;
    else if (c < 0.7) buckets[1] += 1;
    else if (c < 0.85) buckets[2] += 1;
    else buckets[3] += 1;
  }
  return [
    { label: "<50%", count: buckets[0] },
    { label: "50–70%", count: buckets[1] },
    { label: "70–85%", count: buckets[2] },
    { label: "≥85%", count: buckets[3] },
  ];
}

export async function getSlaSummary(firmId: string, now = new Date()): Promise<SlaStageSummary[]> {
  const [events, pendingTasks] = await Promise.all([
    prisma.slaEvent.findMany({
      where: { firmId },
      select: { stage: true, status: true, actualMinutes: true, targetMinutes: true },
    }),
    prisma.reviewTask.findMany({
      where: { status: "PENDING", journalEntry: { firmId } },
      select: { stage: true, createdAt: true, dueAt: true },
    }),
  ]);
  return buildSlaSummary(
    events
      .filter((e) => e.actualMinutes !== null)
      .map((e) => ({ stage: e.stage as ReviewStage, status: e.status as "MET" | "AT_RISK" | "BREACHED", actualMinutes: e.actualMinutes as number, targetMinutes: e.targetMinutes })),
    pendingTasks
      .filter((t) => t.dueAt !== null)
      .map((t) => ({ stage: t.stage as ReviewStage, createdAt: t.createdAt, dueAt: t.dueAt as Date })),
    now,
  );
}

export async function getConfidenceDistribution(firmId: string): Promise<ConfidenceBucket[]> {
  const rows = await prisma.journalEntry.findMany({
    where: { firmId, confidence: { not: null } },
    select: { confidence: true },
  });
  return bucketConfidence(rows.map((r) => r.confidence as number));
}

export async function getRecentActivity(firmId: string, limit = 12): Promise<ActivityItem[]> {
  const logs = await prisma.activityLog.findMany({
    where: { firmId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, userId: true, createdAt: true },
  });
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    label: ACTION_LABELS[l.action] ?? l.action,
    userName: l.userId ? (nameById.get(l.userId) ?? "Sistem") : "Sistem",
    createdAt: l.createdAt.toISOString(),
  }));
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
