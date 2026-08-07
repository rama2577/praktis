import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { getDashboardData, getPipelineData } from "@/server/dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { PipelineQueuesPanel } from "@/components/dashboard/pipeline-queues-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const [kpi, pipeline] = await Promise.all([
    getDashboardData(session.user.firmId),
    getPipelineData(session.user.firmId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Ringkasan operasional real-time kantor akuntansi Anda.
        </p>
      </div>

      <KpiCards data={kpi} />

      <div className="rounded-xl border border-line bg-card/40 p-5">
        <PipelineQueuesPanel initial={pipeline} />
      </div>

      <div className="rounded-xl border border-dashed border-slate-700 bg-card/40 p-6 text-sm text-slate-400">
        <p className="font-medium text-slate-300">Monitoring SLA & Confidence</p>
        <p className="mt-1">Grafik distribusi keyakinan AI dan SLA bars hadir di Task 10.</p>
      </div>
    </div>
  );
}
