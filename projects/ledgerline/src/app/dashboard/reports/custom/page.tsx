import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { CustomReportView } from "@/components/reports/custom-report-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Laporan Custom AI — Praktis" };

export default async function CustomReportsPage() {
  const session = await requireRole(OPERATIONAL_ROLES);

  const clients = await prisma.client.findMany({
    where: { firmId: session.user.firmId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <CustomReportView initialClients={clients} />;
}
