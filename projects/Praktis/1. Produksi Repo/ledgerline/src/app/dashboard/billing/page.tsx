import { getFirmBillingOverview, currentPeriod } from "@/server/billing";
import { requireRole } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TH, TD, TR, Table } from "@/components/ui/table";
import { formatCurrencyRp } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Billing — Praktis" };

const OVER_QUOTA_RATE = 350; // Rp/tx

export default async function BillingPage() {
  const session = await requireRole(SYSTEM_ROLES);
  const firmId = session.user.firmId;
  const period = currentPeriod();
  const overview = await getFirmBillingOverview(firmId, period);

  const usagePct = (used: number, quota: number) =>
    quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-700">
          Pemakaian kuota per klien — periode {overview.period}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate-700">Model</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {overview.billingMode === "QUOTA_ONLY" ? "Kuota-only" : overview.billingMode}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-700">SPT Tahunan</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              label={overview.sptAnnualUnlocked ? "Terbuka" : "Terkunci"}
              tone={overview.sptAnnualUnlocked ? "positive" : "warning"}
            />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-700">Kuota total</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {overview.totalQuota.toLocaleString("id-ID")} baris
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-700">Pemakaian</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {overview.totalUsed.toLocaleString("id-ID")} baris
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900">
          Kuota per Klien
        </h2>
        <Table>
          <thead>
            <tr>
              <TH>Klien</TH>
              <TH className="text-right">Kuota</TH>
              <TH className="text-right">Terpakai</TH>
              <TH className="text-right">Lebih</TH>
              <TH className="text-right">Estimasi biaya lebih</TH>
              <TH className="w-40">Pemakaian</TH>
            </tr>
          </thead>
          <tbody>
            {overview.clients.map((c) => (
              <TR key={c.clientId}>
                <TD className="font-medium text-slate-800">{c.clientName}</TD>
                <TD className="text-right">{c.quota.toLocaleString("id-ID")}</TD>
                <TD className="text-right">{c.used.toLocaleString("id-ID")}</TD>
                <TD className="text-right">
                  {c.overQuota > 0 ? (
                    <span className="font-medium text-rose-600">
                      {c.overQuota.toLocaleString("id-ID")}
                    </span>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="text-right">
                  {c.overQuota > 0 ? formatCurrencyRp(c.overQuota * OVER_QUOTA_RATE) : "—"}
                </TD>
                <TD>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        c.overQuota > 0 ? "bg-rose-500" : "bg-accent"
                      }`}
                      style={{ width: `${usagePct(c.used, c.quota)}%` }}
                    />
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
        <p className="mt-3 text-xs text-slate-700">
          Tarif lebih-kuota: Rp {OVER_QUOTA_RATE.toLocaleString("id-ID")}/transaksi. Kuota di-reset
          setiap awal bulan.
        </p>
      </Card>
    </div>
  );
}
