import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { getUsage, currentPeriod } from "@/server/billing";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]/billing?period=YYYY-MM
 * Pemakaian kuota satu klien pada periode tertentu (Admin/Senior).
 */
export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const period = request.nextUrl.searchParams.get("period") ?? currentPeriod();
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Period harus format YYYY-MM" }, { status: 400 });
  }
  const usage = await getUsage(id, period);
  return NextResponse.json({ usage });
});
