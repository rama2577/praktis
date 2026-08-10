import { notFound } from "next/navigation";
import { validatePortalToken, getPortalDocuments } from "@/server/portal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBytes } from "@/lib/format";
import type { DocumentStatus, DocumentType } from "@prisma/client";

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  BANK_STATEMENT: "Rekening Koran",
  RECEIPT: "Nota / Kwitansi",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: "Menunggu",
  PROCESSING: "Diproses AI",
  PROCESSED: "Selesai",
  FAILED: "Gagal",
};

const STATUS_TONE: Record<DocumentStatus, "neutral" | "accent" | "positive" | "danger"> = {
  PENDING: "neutral",
  PROCESSING: "accent",
  PROCESSED: "positive",
  FAILED: "danger",
};

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await validatePortalToken(token);
  if (!result) notFound();

  const { client } = result;
  const documents = await getPortalDocuments(client.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Portal {client.name}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Pantau status dokumen & upload dokumen baru. Semua data diproses oleh tim akuntan Anda.
        </p>
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold">Upload Dokumen Baru</h2>
        <form
          action={`/api/portal/${token}/documents`}
          method="POST"
          encType="multipart/form-data"
          className="flex flex-wrap items-end gap-3"
        >
          <select
            name="docType"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-yellow-400/50 focus:outline-none"
          >
            <option value="INVOICE">Invoice</option>
            <option value="BANK_STATEMENT">Rekening Koran</option>
            <option value="RECEIPT">Nota / Kwitansi</option>
          </select>
          <input
            type="file"
            name="file"
            accept=".pdf,.jpg,.jpeg,.xlsx"
            className="flex-1 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-yellow-400 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-yellow-300"
          />
          <button
            type="submit"
            className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300"
          >
            Upload
          </button>
        </form>
      </div>

      {/* Daftar dokumen */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Dokumen Anda</h2>
        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
            Belum ada dokumen. Upload dokumen pertama Anda di atas.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">Berkas</th>
                  <th className="px-4 py-3 font-medium">Jenis</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ukuran</th>
                  <th className="px-4 py-3 font-medium">Diunggah</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-slate-800/60 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium">{doc.fileName}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {DOC_TYPE_LABELS[doc.type]}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={STATUS_LABELS[doc.status]} tone={STATUS_TONE[doc.status]} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                      {formatBytes(doc.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
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

      <footer className="mt-8 border-t border-slate-800 pt-4 text-center text-xs text-slate-600">
        Portal Praktis — dokumen diproses otomatis oleh AI, diverifikasi oleh akuntan.
      </footer>
    </div>
  );
}
