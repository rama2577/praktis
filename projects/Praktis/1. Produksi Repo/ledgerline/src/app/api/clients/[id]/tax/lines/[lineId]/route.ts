import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { setLineTaxCode } from "@/server/tax-report";

type Ctx = { params: Promise<{ id: string; lineId: string }> };

/** PATCH /api/clients/[id]/tax/lines/[lineId] — override kode pajak (review tax). */
export const PATCH = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id, lineId } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { taxCode?: string | null; taxBase?: number | null } | null;
  if (!body) return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });

  try {
    const updated = await setLineTaxCode(
      lineId,
      guard.session.user.firmId,
      client.id,
      body.taxCode === undefined ? null : body.taxCode,
      body.taxBase === undefined ? null : body.taxBase,
    );
    return NextResponse.json({ data: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
});
