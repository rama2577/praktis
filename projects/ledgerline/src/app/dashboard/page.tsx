import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import {
  getConfidenceDistribution,
  getDashboardData,
  getExceptionInsights,
  getIndustryBreakdown,
  getPipelineData,
  getRecentActivity,
  getSlaSummary,
  getWeeklyTrend,
} from "@/server/dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { DashboardPanels } from "@/components/dashboard/dashboard-panels";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const firmId = session.user.firmId;
  const [kpi, pipeline, sla, confidence, activity, industry, trend, insights] = await Promise.all([
    getDashboardData(firmId),
    getPipelineData(firmId),
    getSlaSummary(firmId),
    getConfidenceDistribution(firmId),
    getRecentActivity(firmId),
    getIndustryBreakdown(firmId),
    getWeeklyTrend(firmId),
    getExceptionInsights(firmId),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Ringkasan operasional real-time kantor akuntansi Anda.
        </p>
      </div>

      <KpiCards data={kpi} />

      <DashboardPanels initial={{ pipeline, sla, confidence, activity, industry, trend, insights }} />
    </div>
  );
}
