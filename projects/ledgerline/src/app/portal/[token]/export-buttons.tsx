"use client";

import { useState } from "react";

const FORMATS = [
  { key: "pdf", label: "PDF", icon: "📄" },
  { key: "csv", label: "CSV", icon: "📊" },
  { key: "xlsx", label: "XLSX", icon: "📈" },
] as const;

export function ExportButtons({ token }: { token: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (format: string) => {
    setBusy(format);
    setError(null);
    try {
      const res = await fetch(`/api/portal/${token}/reports?format=${format}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Ekspor Laporan</h2>
          <p className="text-xs text-slate-600">Unduh jurnal dalam format PDF, CSV, atau Excel.</p>
        </div>
        <div className="flex gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              disabled={busy === f.key}
              onClick={() => void download(f.key)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-800 transition hover:border-yellow-400/50 hover:bg-slate-200 disabled:opacity-50"
            >
              <span>{f.icon}</span>
              {busy === f.key ? "..." : f.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
