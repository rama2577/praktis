"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DOC_TYPE_OPTIONS = [
  { value: "INVOICE", label: "Invoice" },
  { value: "BANK_STATEMENT", label: "Rekening Koran" },
  { value: "RECEIPT", label: "Nota / Kwitansi" },
] as const;

const ACCEPTED = ".pdf,.jpg,.jpeg,.xlsx";

/** Form upload dokumen: drag & drop + pilih jenis dokumen. */
export function UploadForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>("INVOICE");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function pickFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setFileName(file.name);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file || uploading) return;

    setError(null);
    setUploading(true);

    const form = new FormData();
    form.append("clientId", clientId);
    form.append("docType", docType);
    form.append("file", file);

    const res = await fetch("/api/documents", { method: "POST", body: form });

    if (res.ok) {
      setFileName(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } else if (res.status === 400) {
      const body = (await res.json()) as { errors?: Record<string, string> };
      setError(body.errors?.file ?? body.errors?._form ?? "Berkas ditolak.");
    } else if (res.status === 401 || res.status === 403) {
      setError("Sesi berakhir atau Anda tidak memiliki akses.");
      router.refresh();
    } else {
      setError("Terjadi kesalahan saat mengunggah. Coba lagi.");
    }
    setUploading(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-line bg-card p-5"
      aria-label="Form upload dokumen"
    >
      <h3 className="text-sm font-semibold">Upload Dokumen</h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Format: PDF, JPG, XLSX — maksimal 10 MB.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="doc-type" className="text-sm font-medium text-slate-300">
            Jenis Dokumen <span className="text-red-400">*</span>
          </label>
          <select
            id="doc-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {DOC_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-300">
            Berkas <span className="text-red-400">*</span>
          </span>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-3 text-center text-xs transition ${
              dragging
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-slate-400 hover:border-accent/50 hover:text-slate-300"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <span className="font-medium">
              {fileName ?? "Klik atau seret berkas ke sini"}
            </span>
            <span className="text-slate-500">PDF · JPG · XLSX (maks 10 MB)</span>
          </label>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5">
        <button
          type="submit"
          disabled={uploading || !fileName}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0b1120] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? "Mengunggah..." : "Upload & Masukkan ke Pipeline"}
        </button>
      </div>
    </form>
  );
}
