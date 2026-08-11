import { prisma } from "@/lib/db";
import type { Client, ClientPortalToken, Document, Prisma } from "@prisma/client";
import { explainJournal, summarizeJournal } from "@/server/simple-explain";

const TOKEN_VALIDITY_DAYS = 30;

/** Buat/reset token portal untuk klien. Token lama menjadi invalid. */
export async function ensurePortalToken(clientId: string): Promise<ClientPortalToken> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_VALIDITY_DAYS);

  return prisma.clientPortalToken.upsert({
    where: { clientId },
    create: { clientId, expiresAt },
    update: { expiresAt },
  });
}

/** Validasi token → klien (null jika invalid/expired). */
export async function validatePortalToken(
  token: string,
): Promise<{ client: Client; token: ClientPortalToken } | null> {
  const found = await prisma.clientPortalToken.findUnique({
    where: { token },
    include: { client: true },
  });
  if (!found) return null;
  if (found.expiresAt < new Date()) return null;
  return { client: found.client, token: found };
}

/** Dokumen klien (melalui token). */
export async function getPortalDocuments(
  clientId: string,
): Promise<Document[]> {
  return prisma.document.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// ── F3 / K2 — dedupe dokumen ─────────────────────────────────────────────────

/** Cek apakah file dengan hash yang sama sudah pernah dikirim klien ini (K2). */
export async function findDuplicateDocument(
  clientId: string,
  fileHash: string,
): Promise<{ id: string; fileName: string; createdAt: Date } | null> {
  return prisma.document.findFirst({
    where: { clientId, fileHash },
    select: { id: true, fileName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

// ── F3 / K3 — jurnal read-only + bahasa sederhana ────────────────────────────

/** Jurnal APPROVED/FINALIZED klien (read-only) + penjelasan bahasa sederhana. */
export async function getPortalJournals(clientId: string, take = 30) {
  const rows = await prisma.journalEntry.findMany({
    where: {
      clientId,
      status: { in: ["APPROVED", "FINALIZED"] },
    },
    select: {
      id: true,
      description: true,
      entryDate: true,
      status: true,
      journalType: true,
      lines: {
        select: { accountCode: true, accountName: true, debit: true, credit: true },
      },
    },
    orderBy: { entryDate: "desc" },
    take,
  });

  return rows.map((j) => {
    const lines = j.lines.map((l) => ({
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: Number(l.debit),
      credit: Number(l.credit),
    }));
    return {
      id: j.id,
      description: j.description,
      entryDate: j.entryDate.toISOString(),
      status: j.status,
      journalType: j.journalType,
      lines,
      explanation: explainJournal({
        id: j.id,
        description: j.description,
        entryDate: j.entryDate.toISOString(),
        lines,
      }),
      summary: summarizeJournal({
        id: j.id,
        description: j.description,
        entryDate: j.entryDate.toISOString(),
        lines,
      }),
    };
  });
}

// ── F3 / K1 — timeline dokumen ───────────────────────────────────────────────

const DOC_STEP_ORDER = ["PENDING", "PROCESSING", "PROCESSED", "FAILED"] as const;

/**
 * Status berjenjang per dokumen: diterima → diproses AI → review → selesai.
 * Review diambil dari tahap terakhir ReviewTask jurnal turunannya.
 */
export async function getPortalTimeline(clientId: string) {
  const documents = await prisma.document.findMany({
    where: { clientId },
    include: {
      journals: {
        select: {
          status: true,
          reviewTask: {
            select: { stage: true, status: true, reviewedAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return documents.map((doc) => {
    const latestTask = doc.journals.flatMap((j) => j.reviewTask)[0] ?? null;
    const journalStatus = doc.journals[0]?.status ?? null;
    const stepIndex = DOC_STEP_ORDER.indexOf(doc.status as (typeof DOC_STEP_ORDER)[number]);
    const reviewLabel = latestTask
      ? `${latestTask.stage.replace(/_/g, " ")} — ${latestTask.status === "APPROVED" ? "disetujui" : "menunggu"}`
      : null;
    return {
      id: doc.id,
      fileName: doc.fileName,
      type: doc.type,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      stepIndex,
      steps: DOC_STEP_ORDER.map((s) => ({
        key: s,
        reached: stepIndex >= DOC_STEP_ORDER.indexOf(s),
      })),
      reviewLabel,
      journalStatus,
    };
  });
}

// ── F3 / K5 — snapshot laporan ───────────────────────────────────────────────

/** Daftar snapshot laporan klien (versi per periode). */
export async function listReportSnapshots(clientId: string) {
  return prisma.reportSnapshot.findMany({
    where: { clientId },
    orderBy: [{ period: "desc" }, { version: "desc" }],
    take: 50,
  });
}

/** Simpan snapshot versi berikutnya (unique clientId+period+type+version). */
export async function createReportSnapshot(params: {
  firmId: string;
  clientId: string;
  period: string;
  type: string;
  payload: Prisma.InputJsonValue;
  createdById?: string;
}): Promise<{ id: string; version: number }> {
  const latest = await prisma.reportSnapshot.findFirst({
    where: { clientId: params.clientId, period: params.period, type: params.type },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;
  const created = await prisma.reportSnapshot.create({
    data: {
      firmId: params.firmId,
      clientId: params.clientId,
      period: params.period,
      type: params.type,
      version,
      payload: params.payload,
      createdById: params.createdById,
    },
  });
  return { id: created.id, version };
}

// ── F3 / K4 — notifikasi portal ──────────────────────────────────────────────

const NOTIF_LABELS: Record<string, string> = {
  REPORT_READY: "Laporan siap",
  DOCUMENT_PROCESSED: "Dokumen selesai diproses",
  EXCEPTION: "Perlu perhatian",
  REMINDER: "Pengingat",
};

/** Notifikasi untuk klien (belum dibaca dulu). */
export async function listClientNotifications(clientId: string) {
  const rows = await prisma.clientNotification.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((n) => ({
    ...n,
    typeLabel: NOTIF_LABELS[n.type] ?? n.type,
    createdAt: n.createdAt.toISOString(),
  }));
}

/** Tandai semua notifikasi klien sudah dibaca. */
export async function markNotificationsRead(clientId: string): Promise<number> {
  const res = await prisma.clientNotification.updateMany({
    where: { clientId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}

/** Buat notifikasi (dipakai pipeline/lock). */
export async function notifyClient(params: {
  firmId: string;
  clientId: string;
  type: string;
  message: string;
  link?: string;
}): Promise<void> {
  await prisma.clientNotification.create({
    data: {
      firmId: params.firmId,
      clientId: params.clientId,
      type: params.type,
      message: params.message,
      link: params.link ?? null,
    },
  });
}
