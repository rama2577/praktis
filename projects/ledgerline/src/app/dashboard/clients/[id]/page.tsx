import { requireRole } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/status-badge";
import { UploadForm } from "@/components/documents/upload-form";
import { ClientProfilePanel } from "@/components/clients/client-profile-panel";
import { SubledgerView } from "@/components/clients/subledger-view";
import { PortalLinkButton } from "@/components/clients/portal-link-button";
import { ClientEnrichButton } from "@/components/clients/client-enrich-button";
import { formatBytes } from "@/lib/format";
import Link from "next/link";
import { Role, type DocumentStatus } from "@prisma/client";
import { DOC_TYPE_LABELS, isReferenceDocType, REFERENCE_DOC_TYPES } from "@/ai/doc-type-map";

const PROFILE_EDITORS: Role[] = [Role.ADMIN, Role.PARTNER, Role.SENIOR];

const STATUS_TONE: Record<DocumentStatus, "neutral" | "accent" | "positive" | "danger"> = {
  PENDING: "neutral",
  PROCESSING: "accent",
  PROCESSED: "positive",
  FAILED: "danger",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: "Menunggu",
  PROCESSING: "Diproses AI",
  PROCESSED: "Selesai",
  FAILED: "Gagal",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(SYSTEM_ROLES);
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, firmId: session.user.firmId },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      _count: { select: { journals: true } },
    },
  });

  if (!client) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-card/40 p-10 text-center text-sm text-slate-700">
        Klien tidak ditemukan.{" "}
        <Link href="/dashboard/clients" className="text-accent hover:underline">
          Kembali ke daftar klien
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/clients"
        className="text-xs text-slate-700 transition hover:text-accent"
      >
        ← Kembali ke Klien
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
          <p className="mt-0.5 text-sm text-slate-700">
            {client.taxId ? `NPWP: ${client.taxId} · ` : ""}
            {client._count.journals} jurnal · {client.documents.length} dokumen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClientEnrichButton clientId={client.id} />
          <PortalLinkButton clientId={client.id} />
          <StatusBadge
            label={client.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
            tone={client.status === "ACTIVE" ? "positive" : "neutral"}
          />
        </div>
      </div>

      <div className="mt-6">
        <UploadForm clientId={client.id} />
      </div>

      <ClientProfilePanel
        clientId={client.id}
        canEdit={PROFILE_EDITORS.includes(session.user.role)}
      />

      <div className="mt-6">
        <SubledgerView clientId={client.id} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold">Dokumen Legalitas &amp; Referensi</h2>
        {client.documents.filter((d) => REFERENCE_DOC_TYPES.includes(d.type)).length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-card/40 p-6 text-center text-sm text-slate-700">
            Belum ada dokumen legalitas / struktur organisasi / artikel pengetahuan.
            Upload jenis tersebut di form di atas — teksnya otomatis diindeks sebagai pengetahuan klien.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {client.documents
              .filter((d) => REFERENCE_DOC_TYPES.includes(d.type))
              .map((doc) => (
                <div key={doc.id} className="rounded-xl border border-line bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.fileName}</p>
                      <p className="mt-0.5 text-xs text-slate-700">{DOC_TYPE_LABELS[doc.type]}</p>
                    </div>
                    <StatusBadge label={STATUS_LABELS[doc.status]} tone={STATUS_TONE[doc.status]} />
                  </div>
                  {doc.referenceText && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-accent hover:underline">
                        Lihat teks terindeks ({doc.referenceText.length.toLocaleString("id-ID")} karakter)
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                        {doc.referenceText.slice(0, 4000)}
                        {doc.referenceText.length > 4000 ? "…" : ""}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold">Dokumen</h2>
        {client.documents.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-slate-700">
            Belum ada dokumen untuk klien ini. Upload dokumen pertama di atas.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-slate-700">
                  <th className="px-4 py-3 font-medium">Berkas</th>
                  <th className="px-4 py-3 font-medium">Jenis</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ukuran</th>
                  <th className="px-4 py-3 font-medium">Diunggah</th>
                </tr>
              </thead>
              <tbody>
                {client.documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-line/60 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium">{doc.fileName}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {DOC_TYPE_LABELS[doc.type]}
                      {isReferenceDocType(doc.type) && (
                        <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                          Referensi
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={STATUS_LABELS[doc.status]}
                        tone={STATUS_TONE[doc.status]}
                      />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatBytes(doc.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {doc.createdAt.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
