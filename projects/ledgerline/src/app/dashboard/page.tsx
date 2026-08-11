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
import { DashboardPanels, type DashboardFocus } from "@/components/dashboard/dashboard-panels";

export const dynamic = "force-dynamic";

/** EN-07 — Fokus dashboard per role (lihat docs/design-system.md §9). */
const ROLE_FOCUS: Record<string, DashboardFocus> = {
  JUNIOR: "junior",
  SENIOR: "senior",
  TAX: "tax",
  PARTNER: "partner",
  ADMIN: "admin",
};

const ROLE_SUBTITLE: Record<string, string> = {
  JUNIOR: "Antrian review Anda, prioritas kerja hari ini.",
  SENIOR: "Kualitas review, exception, dan SLA tim.",
  TAX: "Review pajak dan kepatuhan di pipeline.",
  PARTNER: "Kepatuhan SLA, tren kualitas, dan ringkasan firma.",
  ADMIN: "Ringkasan operasional real-time kantor akuntansi Anda.",
};

export default async function DashboardPage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const firmId = session.user.firmId;
  const role = session.user.role;
  const focus = ROLE_FOCUS[role] ?? "admin";
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
        <p className="mt-1 text-sm text-slate-400">{ROLE_SUBTITLE[role] ?? ROLE_SUBTITLE.ADMIN}</p>
      </div>

      <KpiCards data={kpi} />

      <DashboardPanels initial={{ pipeline, sla, confidence, activity, industry, trend, insights }} focus={focus} />
    </div>
  );
}
