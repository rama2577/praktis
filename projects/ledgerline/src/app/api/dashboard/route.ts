import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { getPipelineData } from "@/server/dashboard";

/** GET /api/dashboard — data pipeline & antrian untuk polling ringan (30 dtk). */
export async function GET() {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const data = await getPipelineData(guard.session.user.firmId);
  return NextResponse.json({ data });
}
