import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { completeReconciliation } from "@/server/recon";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/clients/[id]/recon/complete — { period } → status rekonsiliasi. */
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

  const result = await completeReconciliation(client.id, period, guard.session.user.id);
  return NextResponse.json({ data: result, message: result.message });
});
