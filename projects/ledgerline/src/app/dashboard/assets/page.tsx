import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { AssetsView } from "@/components/assets/assets-view";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const session = await requireRole(OPERATIONAL_ROLES);

  const clients = await prisma.client.findMany({
    where: { firmId: session.user.firmId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Aset Tetap</h1>
        <p className="mt-1 text-sm text-slate-600">
          Register aset, penyusutan komersial (PSAK 216) & fiskal (Pasal 11), jurnal otomatis, rekonsiliasi fiskal.
        </p>
      </div>
      <AssetsView clients={clients} />
    </div>
  );
}
