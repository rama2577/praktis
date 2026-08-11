import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TH, TD, TR, Table } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pipeline Produksi — Praktis" };

const STAGES = [
  "DRAFT",
  "JUNIOR_REVIEW",
  "SENIOR_REVIEW",
  "TAX_REVIEW",
  "PARTNER_APPROVAL",
  "APPROVED",
  "FINALIZED",
  "EXCEPTION",
] as const;

const STAGE_LABEL: Record<string, string> = {
  DRAFT: "Draft AI",
  JUNIOR_REVIEW: "Review Junior",
  SENIOR_REVIEW: "Review Senior",
  TAX_REVIEW: "Review Pajak",
  PARTNER_APPROVAL: "Persetujuan Partner",
  APPROVED: "Disetujui",
  FINALIZED: "Final / Tutup Buku",
  EXCEPTION: "Pengecualian",
};

export default async function PipelinePage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const firmId = session.user.firmId;

  const [clients, journals, documents, tasks] = await Promise.all([
    prisma.client.findMany({ where: { firmId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.journalEntry.groupBy({
      by: ["clientId", "status"],
      where: { firmId },
      _count: true,
    }),
    prisma.document.groupBy({
      by: ["clientId", "status"],
      where: { firmId },
      _count: true,
    }),
    prisma.reviewTask.groupBy({
      by: ["stage", "status"],
      where: { status: "PENDING" },
      _count: true,
    }),
  ]);

  const journalMap = new Map<string, number>();
  for (const j of journals) journalMap.set(`${j.clientId}:${j.status}`, j._count);
  const docMap = new Map<string, number>();
  for (const d of documents) docMap.set(`${d.clientId}:${d.status}`, d._count);

  const pendingTasks = tasks.reduce((m, t) => {
    m.set(`${t.stage}:${t.status}`, t._count);
    return m;
  }, new Map<string, number>());

  const totals = new Map<string, number>();
  for (const j of journals) totals.set(j.clientId, (totals.get(j.clientId) ?? 0) + j._count);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-100">Pipeline Produksi</h1>
        <p className="text-sm text-slate-400">
          Alur dokumen klien: upload → ekstraksi AI → draft jurnal → review berjenjang → persetujuan partner → final.
        </p>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold text-slate-100">Status Per Klien</h2>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <TR>
                <TH>Klien</TH>
                {STAGES.map((s) => (
                  <TH key={s} className="text-center">
                    {STAGE_LABEL[s]}
                  </TH>
                ))}
                <TH className="text-center">Total</TH>
              </TR>
            </thead>
            <tbody>
              {clients.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium text-slate-200">{c.name}</TD>
                  {STAGES.map((s) => {
                    const n = journalMap.get(`${c.id}:${s}`) ?? 0;
                    return (
                      <TD key={s} className="text-center">
                        {n > 0 ? (
                          <Badge label={String(n)} tone={s === "EXCEPTION" ? "danger" : s === "APPROVED" || s === "FINALIZED" ? "positive" : "neutral"} />
                        ) : (
                          <span className="text-slate-600">·</span>
                        )}
                      </TD>
                    );
                  })}
                  <TD className="text-center font-semibold text-slate-100">{totals.get(c.id) ?? 0}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-display text-base font-semibold text-slate-100">Antrian Review Pending</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada task pending.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.stage} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
                  <span className="text-slate-300">{STAGE_LABEL[t.stage] ?? t.stage}</span>
                  <Badge label={`${t._count} task`} tone="warning" />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-display text-base font-semibold text-slate-100">Dokumen Masuk</h2>
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada dokumen.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <TR>
                    <TH>Klien</TH>
                    <TH className="text-center">Menunggu</TH>
                    <TH className="text-center">Diproses</TH>
                    <TH className="text-center">Gagal</TH>
                  </TR>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <TR key={c.id}>
                      <TD>{c.name}</TD>
                      <TD className="text-center">{docMap.get(`${c.id}:UPLOADED`) ?? 0}</TD>
                      <TD className="text-center">{docMap.get(`${c.id}:PROCESSED`) ?? 0}</TD>
                      <TD className="text-center">{docMap.get(`${c.id}:FAILED`) ?? 0}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
