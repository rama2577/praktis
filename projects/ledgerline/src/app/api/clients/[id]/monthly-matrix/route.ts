/**
 * GET /api/clients/[id]/monthly-matrix?year=2026
 * Matrix 12 bulan: Laba Rugi per bulan + Neraca posisi akhir bulan (kumulatif).
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { prisma } from "@/lib/db";
import { getMonthlyMatrix } from "@/server/monthly-matrix";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;
  const year = parseInt(request.nextUrl.searchParams.get("year") ?? "", 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Parameter year wajib (YYYY)" }, { status: 400 });
  }
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { name: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  const data = await getMonthlyMatrix(id, client.name, year);
  return NextResponse.json({ data });
});
