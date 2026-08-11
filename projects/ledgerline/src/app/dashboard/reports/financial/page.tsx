import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { FinancialStatementsView } from "@/components/reports/financial-statements-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Laporan Keuangan — Praktis" };

export default async function FinancialStatementsPage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  if (!session) redirect("/login");

  const clients = await prisma.client.findMany({
    where: { firmId: session.user.firmId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <FinancialStatementsView initialClients={clients} />;
}
