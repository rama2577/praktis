import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { getDailyBrief } from "@/server/brief";

/** GET /api/dashboard/brief — inbox cerdas akuntan (ringkasan harian + antrian review). */
export const GET = withTenantApi(async () => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const brief = await getDailyBrief(guard.session.user.firmId);
  return NextResponse.json({ data: brief });
});
