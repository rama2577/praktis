import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TH, TD, TR, Table } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pengaturan — Praktis" };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  SENIOR: "Senior Accountant",
  JUNIOR: "Junior Accountant",
  TAX_SPECIALIST: "Tax Specialist",
  PARTNER: "Partner",
};

export default async function SettingsPage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const firmId = session.user.firmId;

  const [firm, users, clients] = await Promise.all([
    prisma.firm.findUnique({ where: { id: firmId } }),
    prisma.user.findMany({
      where: { firmId },
      select: { id: true, name: true, email: true, role: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.count({ where: { firmId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="text-sm text-slate-700">Profil firma, pengguna, dan informasi workspace.</p>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900">Profil Firma</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-700">Nama</dt>
            <dd className="text-slate-800">{firm?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-700">Klien aktif</dt>
            <dd className="text-slate-800">{clients}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-700">Sesi Anda</dt>
            <dd className="text-slate-800">
              {session.user.name} · {session.user.email} ·{" "}
              <Badge label={ROLE_LABEL[session.user.role] ?? session.user.role} tone="accent" />
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900">Pengguna ({users.length})</h2>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <TR>
                <TH>Nama</TH>
                <TH>Email</TH>
                <TH>Peran</TH>
                <TH>Status</TH>
              </TR>
            </thead>
            <tbody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium text-slate-800">{u.name}</TD>
                  <TD>{u.email}</TD>
                  <TD>{ROLE_LABEL[u.role] ?? u.role}</TD>
                  <TD>
                    <Badge label={u.active ? "Aktif" : "Nonaktif"} tone={u.active ? "positive" : "neutral"} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
