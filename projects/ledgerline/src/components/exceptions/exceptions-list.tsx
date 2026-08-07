"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type ExceptionItem = {
  id: string;
  clientName: string;
  description: string | null;
  exceptionFlag: string | null;
  confidence: number | null;
  documentName: string | null;
  createdAt: string;
};

export function ExceptionsList() {
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/exceptions", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal memuat exception");
      setItems(((await res.json()) as { data: ExceptionItem[] }).data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function start() {
      await load();
    }
    void start();
  }, [load]);

  const resolve = useCallback(
    async (id: string) => {
      setBusy(true);
      setFlash(null);
      try {
        const res = await fetch(`/api/exceptions/${id}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note.trim() }),
        });
        const json = (await res.json()) as { message?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Resolusi gagal");
        setFlash(json.message ?? "Exception diresolusi");
        setOpenId(null);
        setNote("");
        await load();
      } catch (e) {
        setFlash(`Gagal: ${(e as Error).message}`);
      } finally {
        setBusy(false);
      }
    },
    [load, note],
  );

  if (loading) return <SkeletonList rows={2} />;
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon="🎉"
        title="Tidak ada exception"
        description="Semua jurnal lolos pipeline AI tanpa pengecualian."
      />
    );
  }

  return (
    <div className="space-y-4">
      {flash && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {flash}
        </div>
      )}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-red-500/30 bg-card/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-100">{item.clientName}</span>
                  <StatusBadge label="Exception" tone="danger" />
                  <StatusBadge
                    label={item.confidence === null ? "—" : `${Math.round(item.confidence * 100)}% keyakinan AI`}
                    tone="warning"
                  />
                </div>
                <p className="mt-1 text-sm text-slate-300">{item.description ?? "Tanpa deskripsi"}</p>
                <p className="mt-1 text-xs text-red-300/90">🚩 {item.exceptionFlag ?? "Flag tidak tersedia"}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.documentName ?? "Tanpa dokumen"} · dibuat {new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <button
                onClick={() => {
                  setOpenId(openId === item.id ? null : item.id);
                  setNote("");
                }}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20"
              >
                {openId === item.id ? "Tutup" : "Resolusi"}
              </button>
            </div>

            {openId === item.id && (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <p className="text-xs text-slate-400">
                  Resolusi mengirim jurnal ke antrian <span className="text-amber-300">Review Junior</span> untuk diproses ulang (EXCEPTION → JUNIOR_REVIEW).
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan resolusi (mis. Faktur PPN sudah dilengkapi klien)…"
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-yellow-400/50 focus:outline-none"
                />
                <button
                  disabled={busy || !note.trim()}
                  onClick={() => resolve(item.id)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Resolusi & Kirim ke Antrian
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
