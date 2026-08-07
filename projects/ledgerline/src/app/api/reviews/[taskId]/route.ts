import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { nextStatusForAction, transitionJournal } from "@/server/journal-machine";
import type { ReviewAction } from "@/server/journal-machine";

const ACTIONS: ReviewAction[] = ["approve", "reject", "return"];

/**
 * POST /api/reviews/[taskId]
 * Body: { action: "approve" | "reject" | "return", note?: string }
 * Guard: pemilik task (assigneeId) atau ADMIN. Transisi via state machine
 * terpusat (transitionJournal) — tidak ada jalur langsung lain.
 */
export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await auth();
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const user = guard.session.user;

  const { taskId } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; note?: string };
  if (!body.action || !ACTIONS.includes(body.action as ReviewAction)) {
    return NextResponse.json({ error: "Aksi tidak valid. Gunakan approve, reject, atau return." }, { status: 400 });
  }
  const action = body.action as ReviewAction;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 2000) : null;

  const task = await prisma.reviewTask.findFirst({
    where: { id: taskId, status: "PENDING", journalEntry: { firmId: user.firmId } },
    include: { journalEntry: { include: { client: { select: { name: true } } } } },
  });
  if (!task) return NextResponse.json({ error: "Task review tidak ditemukan atau sudah diproses." }, { status: 404 });

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && task.assigneeId !== user.id) {
    return NextResponse.json({ error: "Task ini bukan milik Anda." }, { status: 403 });
  }

  if (action === "reject" && !note) {
    return NextResponse.json({ error: "Catatan wajib diisi saat menolak jurnal." }, { status: 400 });
  }

  const actor = await prisma.user.findUnique({ where: { id: user.id } });
  if (!actor) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

  const to = nextStatusForAction(task.stage, action);
  try {
    const result = await transitionJournal(to, action, { firmId: user.firmId, actor, task, note });
    return NextResponse.json({
      data: { journalId: result.entryId, from: result.from, to: result.to, action },
      message:
        action === "approve"
          ? `Jurnal disetujui (${result.from} → ${result.to}).`
          : action === "reject"
            ? "Jurnal ditolak dengan catatan."
            : `Jurnal dikembalikan (${result.from} → ${result.to}).`,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
