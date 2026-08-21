/**
 * Sign-off Workflow — Draft → In Review → Approved → Delivered.
 * Big 4 standard: setiap laporan keuangan harus melewati minimal
 * 3 lapis review sebelum dikirim ke klien.
 *
 * Status flow:
 *   DRAFT ──(submit)──→ IN_REVIEW ──(approve)──→ APPROVED ──(deliver)──→ DELIVERED
 *     ↑                    │                        │
 *     └──(reject)──────────┘                        │
 *                                                   └── semuanya final
 */

import type { Prisma } from "@prisma/client";
import type { ReportSnapshotStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

// ── Types ────────────────────────────────────────────────────────────────────

export type SnapshotMeta = {
  id: string;
  clientId: string;
  clientName: string;
  period: string;
  type: string;
  status: ReportSnapshotStatus;
  version: number;
  notes: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  deliveredAt: Date | null;
};

export type WorkflowStatus = {
  canSubmit: boolean;     // DRAFT → IN_REVIEW
  canApprove: boolean;    // IN_REVIEW → APPROVED
  canDeliver: boolean;    // APPROVED → DELIVERED
  canReject: boolean;     // IN_REVIEW → DRAFT (kembali)
  isFinal: boolean;       // DELIVERED
  status: ReportSnapshotStatus;
  label: string;
};

// ── Status Labels ────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<ReportSnapshotStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "Dalam Review",
  APPROVED: "Disetujui",
  DELIVERED: "Terkirim",
};

export const STATUS_TONES: Record<ReportSnapshotStatus, "neutral" | "warning" | "positive" | "accent"> = {
  DRAFT: "neutral",
  IN_REVIEW: "warning",
  APPROVED: "positive",
  DELIVERED: "accent",
};

export function getWorkflowStatus(status: ReportSnapshotStatus): WorkflowStatus {
  return {
    canSubmit: status === "DRAFT",
    canApprove: status === "IN_REVIEW",
    canDeliver: status === "APPROVED",
    canReject: status === "IN_REVIEW",
    isFinal: status === "DELIVERED",
    status,
    label: STATUS_LABELS[status],
  };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** Simpan laporan sebagai snapshot + langsung auto-submit untuk review. */
export async function saveReportSnapshot(input: {
  firmId: string;
  clientId: string;
  period: string;
  type: string;
  payload: Prisma.JsonValue;
  createdById?: string;
  notes?: string;
}): Promise<SnapshotMeta> {
  const latest = await prisma.reportSnapshot.findFirst({
    where: { clientId: input.clientId, period: input.period, type: input.type },
    orderBy: { version: "desc" },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const snap = await prisma.reportSnapshot.create({
    data: {
      firmId: input.firmId,
      clientId: input.clientId,
      period: input.period,
      type: input.type,
      status: "IN_REVIEW", // auto-submit saat disimpan
      version: nextVersion,
      payload: input.payload as Prisma.InputJsonValue,
      notes: input.notes ?? null,
      createdById: input.createdById ?? null,
    },
  });
  return mapSnapshot(snap);
}

/** Submit draft untuk review. */
export async function submitForReview(snapshotId: string, userId: string): Promise<SnapshotMeta> {
  const snap = await prisma.reportSnapshot.update({
    where: { id: snapshotId },
    data: { status: "IN_REVIEW", reviewedById: userId, reviewedAt: new Date() },
  });
  return mapSnapshot(snap);
}

/** Approve laporan setelah review. */
export async function approveSnapshot(snapshotId: string, userId: string): Promise<SnapshotMeta> {
  const snap = await prisma.reportSnapshot.update({
    where: { id: snapshotId },
    data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
  });
  return mapSnapshot(snap);
}

/** Deliver laporan ke klien (final). */
export async function deliverSnapshot(snapshotId: string): Promise<SnapshotMeta> {
  const snap = await prisma.reportSnapshot.update({
    where: { id: snapshotId },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
  return mapSnapshot(snap);
}

/** Reject & kembalikan ke draft (senior tidak setuju). */
export async function rejectSnapshot(snapshotId: string, notes?: string): Promise<SnapshotMeta> {
  const snap = await prisma.reportSnapshot.update({
    where: { id: snapshotId },
    data: { status: "DRAFT", notes },
  });
  return mapSnapshot(snap);
}

/** List semua snapshot untuk klien + periode. */
export async function getReportSnapshots(
  clientId: string,
  period: string,
): Promise<SnapshotMeta[]> {
  const snaps = await prisma.reportSnapshot.findMany({
    where: { clientId, period },
    orderBy: { createdAt: "desc" },
  });
  return snaps.map(mapSnapshot);
}

// ── Helper ───────────────────────────────────────────────────────────────────

function mapSnapshot(s: {
  id: string;
  clientId: string;
  client?: { name: string | null } | null;
  period: string;
  type: string;
  status: ReportSnapshotStatus;
  version: number;
  notes: string | null;
  createdAt: Date;
  reviewedAt?: Date | null;
  reviewedBy?: { name: string | null } | null;
  approvedAt?: Date | null;
  approvedBy?: { name: string | null } | null;
  deliveredAt?: Date | null;
}): SnapshotMeta {
  return {
    id: s.id,
    clientId: s.clientId,
    clientName: s.client?.name ?? "",
    period: s.period,
    type: s.type,
    status: s.status,
    version: s.version,
    notes: s.notes ?? null,
    createdAt: s.createdAt,
    reviewedAt: s.reviewedAt ?? null,
    reviewedBy: s.reviewedBy?.name ?? null,
    approvedAt: s.approvedAt ?? null,
    approvedBy: s.approvedBy?.name ?? null,
    deliveredAt: s.deliveredAt ?? null,
  };
}
