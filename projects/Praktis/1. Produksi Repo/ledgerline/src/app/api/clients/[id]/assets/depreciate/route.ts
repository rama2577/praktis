import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { depreciateClientPeriod } from "@/server/assets";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/clients/[id]/assets/depreciate — hitung & catat penyusutan semua aset untuk {period}. */
export const POST = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { period?: string } | null;
  const period = body?.period?.trim();
  if (!period) return NextResponse.json({ error: "Periode (YYYY-MM) wajib diisi." }, { status: 400 });

  try {
    const results = await depreciateClientPeriod(client.id, guard.session.user.firmId, period, guard.session.user.id);
    const done = results.filter((r) => !r.skipped);
    const skipped = results.filter((r) => r.skipped);
    return NextResponse.json({
      data: results,
      message: `Penyusutan ${period}: ${done.length} jurnal dibuat, ${skipped.length} periode sudah tercatat.`,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
});
