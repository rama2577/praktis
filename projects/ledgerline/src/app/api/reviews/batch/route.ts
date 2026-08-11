import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { batchApproveTasks, BATCH_APPROVE_CONFIDENCE_MIN } from "@/server/journal-machine";

const MAX_BATCH = 50;

/**
 * EN-06 — POST /api/reviews/batch
 * Body: { taskIds: string[] } — setujui banyak task sekaligus.
 * Hanya task PENDING milik firma (dan milik user, kecuali ADMIN) dengan
 * confidence ≥ 85% yang disetujui; sisanya di-skip. Tetap lewat state
 * machine terpusat (transitionJournal) per task.
 */
export const POST = withTenantApi(async (req) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const user = guard.session.user;

  const body = (await req.json().catch(() => null)) as { taskIds?: unknown } | null;
  const taskIds = Array.isArray(body?.taskIds) ? body.taskIds.filter((x): x is string => typeof x === "string") : [];
  if (taskIds.length === 0) {
    return NextResponse.json({ error: "taskIds wajib (array id task)" }, { status: 400 });
  }
  if (taskIds.length > MAX_BATCH) {
    return NextResponse.json({ error: `Maksimal ${MAX_BATCH} task per batch` }, { status: 400 });
  }

  const actor = await prisma.user.findUnique({ where: { id: user.id } });
  if (!actor) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

  try {
    const result = await batchApproveTasks({
      firmId: user.firmId,
      userId: user.id,
      role: user.role,
      taskIds,
      actor,
    });
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
});

export { BATCH_APPROVE_CONFIDENCE_MIN };
