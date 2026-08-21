import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { deleteReportTemplate } from "@/server/custom-report";

type Ctx = { params: Promise<{ id: string; templateId: string }> };

/** DELETE /api/clients/[id]/custom-reports/templates/[templateId] — hapus template. */
export const DELETE = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id, templateId } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  try {
    await deleteReportTemplate(client.id, templateId, guard.session.user.id);
    return NextResponse.json({ data: { id: templateId }, message: "Template dihapus." });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
});
