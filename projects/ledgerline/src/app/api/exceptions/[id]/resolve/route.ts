import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { resolveException } from "@/server/journal-machine";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/exceptions/[id]/resolve — { note } → EXCEPTION → JUNIOR_REVIEW. */
export const POST = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const user = guard.session.user;

  const body = (await req.json().catch(() => ({}))) as { note?: string };
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 2000) : null;
  if (!note) {
    return NextResponse.json({ error: "Catatan resolusi wajib diisi." }, { status: 400 });
  }

  const actor = await prisma.user.findUnique({ where: { id: user.id } });
  if (!actor) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

  const { id } = await ctx.params;
  try {
    const result = await resolveException({ firmId: user.firmId, journalId: id, actor, note });
    return NextResponse.json({
      data: result,
      message: "Exception diresolusi — jurnal dikirim ke antrian Review Junior.",
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
});
