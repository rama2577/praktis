import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { JournalStatus } from "@prisma/client";

const sinceLastDay = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

export default async function DashboardPage() {
  await requireRole(OPERATIONAL_ROLES);

  const [activeClients, pendingReviews, drafts, approvedToday] = await Promise.all([
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.reviewTask.count({ where: { status: "PENDING" } }),
    prisma.journalEntry.count({ where: { status: JournalStatus.DRAFT } }),
    prisma.journalEntry.count({
      where: { status: JournalStatus.APPROVED, updatedAt: { gte: sinceLastDay() } },
    }),
  ]);

  const cards = [
    { label: "Klien Aktif", value: activeClients, hint: "tenant aktif" },
    { label: "Antrian Menunggu Review", value: pendingReviews, hint: "di semua stage" },
    { label: "Draft Jurnal (AI)", value: drafts, hint: "menunggu proses" },
    { label: "Disetujui Hari Ini", value: approvedToday, hint: "24 jam terakhir" },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Ringkasan operasional real-time. KPI lengkap, pipeline, dan SLA hadir di Task 8–10.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-line bg-card p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-card p-5 text-sm text-slate-400">
        Modul berikutnya di shell ini: Pipeline Produksi (Task 9), Antrian Review (Task 7),
        Monitoring SLA (Task 10), dan halaman sistem (Task 4/8/11).
      </div>
    </div>
  );
}
