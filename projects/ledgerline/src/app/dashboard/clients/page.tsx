import { requireRole } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { listClients } from "@/server/clients";
import { ClientsManager } from "./clients-manager";
import { INDUSTRY_LABELS } from "@/lib/industries";

export default async function ClientsPage() {
  const session = await requireRole(SYSTEM_ROLES);
  const clients = await listClients(session.user.firmId);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Klien</h1>
      <p className="mt-1 text-sm text-slate-700">
        Kelola klien kantor akuntan. Industri menentukan COA yang dipakai saat
        AI menyusun draft jurnal.
      </p>

      <ClientsManager
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          industry: c.industry,
          taxId: c.taxId,
          status: c.status,
          documentCount: c._count.documents,
          journalCount: c._count.journals,
        }))}
        industryLabels={INDUSTRY_LABELS}
      />

      {clients.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-card/40 p-10 text-center text-sm text-slate-700">
          Belum ada klien. Klik <span className="font-medium text-accent">+ Tambah Klien</span>{" "}
          untuk mulai.
        </div>
      ) : null}
    </div>
  );
}
