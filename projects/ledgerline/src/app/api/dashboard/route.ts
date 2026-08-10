import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { getConfidenceDistribution, getIndustryBreakdown, getExceptionInsights, getPipelineData, getRecentActivity, getSlaSummary, getWeeklyTrend } from "@/server/dashboard";

/** GET /api/dashboard — pipeline, antrian, SLA, confidence & activity untuk polling ringan (30 dtk). */
export async function GET() {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const firmId = guard.session.user.firmId;
  const [pipeline, sla, confidence, activity, industry, trend, insights] = await Promise.all([
    getPipelineData(firmId),
    getSlaSummary(firmId),
    getConfidenceDistribution(firmId),
    getRecentActivity(firmId),
    getIndustryBreakdown(firmId),
    getWeeklyTrend(firmId),
    getExceptionInsights(firmId),
  ]);
  return NextResponse.json({ data: { pipeline, sla, confidence, activity, industry, trend, insights } });
}
