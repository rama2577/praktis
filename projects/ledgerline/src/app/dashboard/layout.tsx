import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Providers } from "@/components/providers";
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

  const firm = await prisma.firm.findUnique({
    where: { id: session.user.firmId },
    select: { segment: true },
  });

  return (
    <Providers>
      <DashboardShell
        userName={session.user.name ?? "User"}
        userRole={session.user.role}
        segment={firm?.segment ?? "FIRMA_AKUNTAN"}
        today={today}
      >
        {children}
      </DashboardShell>
    </Providers>
  );
}
