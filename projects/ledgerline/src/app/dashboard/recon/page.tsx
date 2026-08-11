import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { ReconView } from "@/components/recon/recon-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Rekonsiliasi Bank — Praktis" };

export default async function ReconPage() {
  const session = await requireRole(OPERATIONAL_ROLES);

  const clients = await prisma.client.findMany({
    where: { firmId: session.user.firmId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <ReconView initialClients={clients} />;
}
