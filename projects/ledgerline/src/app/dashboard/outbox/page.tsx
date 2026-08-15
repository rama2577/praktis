import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TH, TD, TR, Table } from "@/components/ui/table";
import { OutboxClientFilter } from "@/components/outbox/client-filter";

export const dynamic = "force-dynamic";

export const metadata = { title: "Outbox Event — Praktis" };

const EVENT_LABEL: Record<string, string> = {
  journalApproved: "Jurnal disetujui",
  journalException: "Pengecualian jurnal",
  slaBreach: "Pelanggaran SLA",
  documentProcessed: "Dokumen diproses",
  reportReady: "Laporan siap",
};

const STATUS_TONE: Record<string, "positive" | "warning" | "danger" | "neutral"> = {
  PENDING: "warning",
  PROCESSED: "positive",
  FAILED: "danger",
};

export default async function OutboxPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const session = await requireRole(OPERATIONAL_ROLES);
  const { client: clientFilter } = await searchParams;

  const events = await prisma.outboxEvent.findMany({
    where: { firmId: session.user.firmId, ...(clientFilter ? { clientId: clientFilter } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  // Semua klien firma untuk dropdown sortir (bukan hanya yang punya event).
  const clients = await prisma.client.findMany({
    where: { firmId: session.user.firmId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const summary = {
    pending: events.filter((e) => e.status === "PENDING").length,
    processed: events.filter((e) => e.status === "PROCESSED").length,
    failed: events.filter((e) => e.status === "FAILED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Outbox Event</h1>
        <p className="text-sm text-slate-700">
          Antrian event keluar (notifikasi klien, webhook, integrasi) dengan retry otomatis — pola transactional outbox.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-slate-700">Pending</div>
          <div className="font-display text-xl font-bold text-amber-600">{summary.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-700">Terproses</div>
          <div className="font-display text-xl font-bold text-emerald-600">{summary.processed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-700">Gagal</div>
          <div className="font-display text-xl font-bold text-rose-600">{summary.failed}</div>
        </Card>
      </div>

      {/* Filter klien */}
      <div className="flex flex-wrap items-center gap-3">
        <OutboxClientFilter clients={clients} value={clientFilter ?? ""} total={events.length} />
        {clientFilter && (
          <a
            href="/dashboard/outbox"
            className="mt-4 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 hover:text-slate-800"
          >
            ✕ Hapus filter
          </a>
        )}
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900">Event Terbaru ({events.length})</h2>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <TR>
                <TH>Waktu</TH>
                <TH>Event</TH>
                <TH>Klien</TH>
                <TH>Status</TH>
                <TH className="text-center">Retry</TH>
              </TR>
            </thead>
            <tbody>
              {events.map((e) => (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap text-slate-700">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}</TD>
                  <TD>{EVENT_LABEL[e.eventType] ?? e.eventType}</TD>
                  <TD>{e.clientId ? (clientName.get(e.clientId) ?? "—") : "—"}</TD>
                  <TD>
                    <Badge label={e.status} tone={STATUS_TONE[e.status] ?? "neutral"} />
                  </TD>
                  <TD className="text-center">
                    {e.retryCount}/{e.maxRetries}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
        {events.length === 0 && <p className="py-6 text-center text-sm text-slate-700">Belum ada event outbox.</p>}
      </Card>
    </div>
  );
}
