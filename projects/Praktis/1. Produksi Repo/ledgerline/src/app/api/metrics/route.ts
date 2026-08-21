import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { getClerkMetrics, getFirmMetrics } from "@/server/metrics";

/** GET /api/metrics — metrik per clerk + ringkasan firma (Admin/Senior). */
export const GET = withTenantApi(async () => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const firmId = guard.session.user.firmId;
  const [clerks, firm] = await Promise.all([getClerkMetrics(firmId), getFirmMetrics(firmId)]);

  return NextResponse.json({ data: { clerks, firm } });
});
