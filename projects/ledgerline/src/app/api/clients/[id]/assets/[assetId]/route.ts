import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getAssetDetail } from "@/server/assets";

type Ctx = { params: Promise<{ id: string; assetId: string }> };

/** GET /api/clients/[id]/assets/[assetId] — detail aset + jadwal penyusutan. */
export const GET = withTenantApi<Ctx>(async (_req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id, assetId } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const detail = await getAssetDetail(assetId, client.id);
  if (!detail) return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ data: detail });
});
