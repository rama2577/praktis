import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { editJournalLines, validateEditLines, type EditLineInput } from "@/server/journal-edit";

/**
 * POST /api/reviews/[taskId]/edit
 * Body: { lines: EditLineInput[] }
 * Simpan koreksi baris jurnal saat review — status task & jurnal TETAP di
 * stage yang sama (revisi draft). Perubahan tercatat ke JournalCorrection
 * (feedback KB) + ActivityLog JOURNAL_EDITED.
 */
export const POST = withTenantApi<{ params: Promise<{ taskId: string }> }>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const user = guard.session.user;

  const { taskId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { lines?: unknown };
  const validated = validateEditLines(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const task = await prisma.reviewTask.findFirst({
    where: { id: taskId, status: "PENDING", journalEntry: { firmId: user.firmId } },
  });
  if (!task) return NextResponse.json({ error: "Task review tidak ditemukan atau sudah diproses." }, { status: 404 });

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && task.assigneeId !== user.id) {
    return NextResponse.json({ error: "Task ini bukan milik Anda." }, { status: 403 });
  }

  const actor = await prisma.user.findUnique({ where: { id: user.id } });
  if (!actor) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

  try {
    const result = await editJournalLines({
      firmId: user.firmId,
      actor,
      task,
      lines: validated.lines as EditLineInput[],
    });
    return NextResponse.json({
      data: result,
      message:
        result.corrections > 0
          ? `Jurnal diperbarui — ${result.corrections} koreksi tercatat (feedback KB).`
          : "Jurnal disimpan tanpa perubahan.",
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ error: err.message }, { status: err.status ?? 409 });
  }
});
