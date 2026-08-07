import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
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
    <div className="flex min-h-screen">
      <Sidebar userName={session.user.name ?? "User"} userRole={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-card/40 px-6 py-3.5">
          <h2 className="text-sm font-medium text-slate-300">Operations Dashboard</h2>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="hidden sm:inline">{today}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-400">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              AI Online
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
