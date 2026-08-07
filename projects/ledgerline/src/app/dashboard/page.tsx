import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { getDashboardData } from "@/server/dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const data = await getDashboardData(session.user.firmId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Ringkasan operasional real-time kantor akuntansi Anda.
        </p>
      </div>

      <KpiCards data={data} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-dashed border-slate-700 bg-card/40 p-6 text-sm text-slate-400">
          <p className="font-medium text-slate-300">Pipeline Produksi</p>
          <p className="mt-1">Visualisasi alur Draft → Rule Engine → Junior → Senior → Tax hadir di Task 9.</p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-700 bg-card/40 p-6 text-sm text-slate-400">
          <p className="font-medium text-slate-300">Monitoring SLA & Confidence</p>
          <p className="mt-1">Grafik distribusi keyakinan AI dan SLA bars hadir di Task 10.</p>
        </div>
      </div>
    </div>
  );
}
