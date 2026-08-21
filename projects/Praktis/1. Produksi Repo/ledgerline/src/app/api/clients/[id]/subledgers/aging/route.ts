/**
 * GET /api/clients/[id]/subledgers/aging — aging piutang per pelanggan.
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { getAging } from "@/server/subledger";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const params = ctx.params;
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await params;
  const asOfParam = request.nextUrl.searchParams.get("asOf");
  const asOf = asOfParam ? new Date(asOfParam) : new Date();
  const data = await getAging(id, asOf);
  return NextResponse.json({ data });
});
