import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { FinancialReportsPage } from "@/components/reports/financial-reports-page";

export const dynamic = "force-dynamic";

export const metadata = { title: "Laporan Keuangan — Praktis" };

export default async function FinancialReportsRoute() {
  const session = await requireRole(OPERATIONAL_ROLES);

  const clients = await prisma.client.findMany({
    where: { firmId: session.user.firmId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <FinancialReportsPage initialClients={clients} />;
}
