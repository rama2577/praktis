import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { TaxView } from "@/components/tax/tax-view";

export const dynamic = "force-dynamic";

export default async function TaxPage() {
  const session = await requireRole(OPERATIONAL_ROLES);

  const clients = await prisma.client.findMany({
    where: { firmId: session.user.firmId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Core Tax</h1>
        <p className="mt-1 text-sm text-slate-400">
          Kode pajak per baris jurnal, review tax specialist, dan export SPT (1111, 1771 + rekonsiliasi fiskal, PPh 21/23/4(2)) siap upload Core Tax DJP.
        </p>
      </div>
      <TaxView clients={clients} />
    </div>
  );
}
