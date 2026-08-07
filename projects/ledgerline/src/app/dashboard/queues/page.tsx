import type { Metadata } from "next";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { QueueList } from "@/components/queues/queue-list";

export const metadata: Metadata = { title: "Antrian Review — LedgerLine" };

export default async function QueuesPage() {
  await requireRole(OPERATIONAL_ROLES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Antrian Review</h1>
        <p className="mt-1 text-sm text-slate-400">
          Jurnal yang menunggu persetujuan Anda, diurutkan berdasarkan urgensi.
        </p>
      </div>
      <QueueList />
    </div>
  );
}
