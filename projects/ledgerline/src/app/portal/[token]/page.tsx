import { notFound } from "next/navigation";
import {
  validatePortalToken,
  getPortalDocuments,
  getPortalTimeline,
} from "@/server/portal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBytes } from "@/lib/format";
import { ExportButtons } from "./export-buttons";
import { PortalNotifications } from "@/components/portal/portal-notifications";
import { PortalJournals } from "@/components/portal/portal-journals";
import { PortalSnapshots } from "@/components/portal/portal-snapshots";
import type { DocumentStatus } from "@prisma/client";
import { ACTIVE_DOC_TYPES, DOC_TYPE_LABELS } from "@/ai/doc-type-map";

const STEP_LABELS = ["Diterima", "Diproses AI", "Selesai", "Gagal"] as const;

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
  const [documents, timeline] = await Promise.all([
    getPortalDocuments(client.id),
    getPortalTimeline(client.id),
  ]);

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
            defaultValue="BANK_STATEMENT"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-yellow-400/50 focus:outline-none"
          >
            {ACTIVE_DOC_TYPES.map((value) => (
              <option key={value} value={value}>
                {DOC_TYPE_LABELS[value]}
              </option>
            ))}
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

      {/* Notifikasi (K4) */}
      <div className="mt-6">
        <PortalNotifications token={token} />
      </div>

      {/* Status dokumen berjenjang (K1/EN-08) */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Status Dokumen — Sampai Mana?</h2>
        {timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
            Belum ada dokumen untuk dilacak.
          </div>
        ) : (
          <div className="space-y-3">
            {timeline.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-200">{item.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <ol className="mt-3 flex items-center gap-1 text-xs">
                  {item.steps.map((step, i) => (
                    <li key={step.key} className="flex items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          step.reached
                            ? i === item.stepIndex
                              ? "bg-yellow-400 text-slate-950"
                              : "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {STEP_LABELS[i]}
                      </span>
                      {i < item.steps.length - 1 && <span className="text-slate-700">→</span>}
                    </li>
                  ))}
                </ol>
                {item.reviewLabel && (
                  <p className="mt-2 text-xs text-slate-400">Review akuntan: {item.reviewLabel}</p>
                )}
                {item.journalStatus && item.journalStatus === "APPROVED" && (
                  <p className="mt-1 text-xs text-emerald-300">✓ Transaksi sudah dicatat</p>
                )}
              </div>
            ))}
          </div>
        )}
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

      {/* Export */}
      <div className="mt-6">
        <ExportButtons token={token} />
      </div>


      {/* Transaksi read-only (K3) */}
      <div className="mt-6">
        <PortalJournals token={token} />
      </div>

      {/* Laporan & versi (K5) */}
      <div className="mt-6">
        <PortalSnapshots token={token} />
      </div>

      {/* Privasi (K6) */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <h2 className="mb-2 text-sm font-semibold">Privasi &amp; Keamanan Data Anda</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-400">
          <li>Seluruh dokumen dienkripsi saat tersimpan (AES-256-GCM) dan dikirim lewat koneksi aman (TLS).</li>
          <li>Data hanya dipakai untuk pembukuan firma akuntan Anda — tidak digunakan untuk melatih model lintas firma.</li>
          <li>Akses portal Anda unik per klien; token kedaluwarsa otomatis.</li>
        </ul>
      </div>

      <footer className="mt-8 border-t border-slate-800 pt-4 text-center text-xs text-slate-600">
        Portal Praktis — dokumen diproses otomatis oleh AI, diverifikasi oleh akuntan.
      </footer>
    </div>
  );
}
