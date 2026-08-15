import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { scanInbox } from "@/server/agent";

/** POST /api/dashboard/scan — pindai inbox firma (trigger manual agent proaktif). */
export const POST = withTenantApi(async () => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const scan = await scanInbox(guard.session.user.firmId);
  return NextResponse.json({ data: scan });
});
