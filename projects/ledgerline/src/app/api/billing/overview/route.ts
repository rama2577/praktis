import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { getFirmBillingOverview, currentPeriod } from "@/server/billing";

/**
 * GET /api/billing/overview?period=YYYY-MM
 * Overview pemakaian kuota seluruh klien aktif firma (Admin/Senior).
 */
export const GET = withTenantApi(async (request) => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const period = request.nextUrl.searchParams.get("period") ?? currentPeriod();
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Period harus format YYYY-MM" }, { status: 400 });
  }
  const overview = await getFirmBillingOverview(guard.session.user.firmId, period);
  return NextResponse.json({ overview });
});
