import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { SlaView } from "@/components/sla/sla-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Monitoring SLA — Praktis" };

export default async function SlaPage() {
  await requireRole(OPERATIONAL_ROLES);
  return <SlaView />;
}
