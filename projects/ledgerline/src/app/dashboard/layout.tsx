import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { canAccess } from "@/lib/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccess(session.user.role, OPERATIONAL_ROLES)) {
    redirect("/login");
  }

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell
      userName={session.user.name ?? "User"}
      userRole={session.user.role}
      today={today}
    >
      {children}
    </DashboardShell>
  );
}
