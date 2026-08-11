"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatCurrencyRp, formatBytes } from "@/lib/format";

type ExceptionItem = {
  id: string;
  clientName: string;
  description: string | null;
  exceptionFlag: string | null;
  confidence: number | null;
  documentName: string | null;
  createdAt: string;
};

type ExceptionDetail = {
  id: string;
  clientName: string;
  description: string | null;
  exceptionFlag: string | null;
  confidence: number | null;
  journalType: string;
  entryDate: string;
  document: {
    id: string;
    fileName: string;
    type: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  } | null;
  lines: { accountCode: string; accountName: string; debit: number; credit: number }[];
  rule: { kind: string; label: string; template: string; psakRef: string; score: number } | null;
};

const TYPE_LABELS: Record<string, string> = {
  AI: "Otomatis AI",
  MANUAL: "Manual",
  ADJUSTING: "Penyesuaian",
};

export function ExceptionsList() {
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExceptionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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

  const openDetail = useCallback(async (id: string) => {
    setOpenId(id);
    setNote("");
    if (id) {
      setDetailLoading(true);
      setDetail(null);
      try {
        const res = await fetch(`/api/exceptions/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.json()).error ?? "Gagal memuat detail");
        setDetail(((await res.json()) as { data: ExceptionDetail }).data);
      } catch (e) {
        setFlash(`Gagal memuat detail: ${(e as Error).message}`);
      } finally {
        setDetailLoading(false);
      }
    }
  }, []);

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
        setDetail(null);
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
                onClick={() => void openDetail(openId === item.id ? "" : item.id)}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20"
              >
                {openId === item.id ? "Tutup" : "Resolusi"}
              </button>
            </div>

            {/* EN-06 — Exception one-screen: dokumen + draft + aturan */}
            {openId === item.id && (
              <div className="mt-4 space-y-4 border-t border-line pt-4">
                {detailLoading && <p className="text-sm text-slate-400">Memuat detail…</p>}

                {detail && (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {/* Kiri: dokumen sumber + aturan */}
                    <div className="space-y-4 lg:col-span-1">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Dokumen Sumber
                        </h3>
                        {detail.document ? (
                          <div className="space-y-1 text-sm">
                            <p className="break-all font-medium text-slate-200">{detail.document.fileName}</p>
                            <p className="text-xs text-slate-500">
                              {TYPE_LABELS[detail.document.type] ?? detail.document.type} · {formatBytes(detail.document.sizeBytes)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Diunggah {new Date(detail.document.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            <a
                              href={`/api/documents/${detail.document.id}/file`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block rounded border border-yellow-400/40 bg-yellow-400/10 px-2 py-1 text-xs text-yellow-300 hover:bg-yellow-400/20"
                            >
                              🔍 Buka dokumen
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">Tanpa dokumen sumber</p>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Aturan & Alasan
                        </h3>
                        {detail.rule ? (
                          <div className="space-y-1 text-sm">
                            <p className="text-slate-200">
                              Deteksi: <span className="font-medium text-amber-300">{detail.rule.label}</span>
                            </p>
                            <p className="text-xs text-slate-500">
                              Template {detail.rule.template} · {detail.rule.psakRef} · skor {detail.rule.score}%
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">Tidak ada aturan yang cocok — butuh penilaian manual.</p>
                        )}
                        <p className="mt-2 text-xs text-red-300/90">🚩 {detail.exceptionFlag ?? "Flag tidak tersedia"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Jenis jurnal: {TYPE_LABELS[detail.journalType] ?? detail.journalType} ·{" "}
                          {new Date(detail.entryDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>

                    {/* Kanan: draft jurnal AI */}
                    <div className="lg:col-span-2">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Draft Jurnal AI
                          </h3>
                          <StatusBadge
                            label={detail.confidence === null ? "Tanpa skor" : `${Math.round(detail.confidence * 100)}% keyakinan`}
                            tone="warning"
                          />
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[420px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                                <th className="py-2 pr-2 font-medium">Kode</th>
                                <th className="py-2 pr-2 font-medium">Akun</th>
                                <th className="py-2 pr-2 text-right font-medium">Debit</th>
                                <th className="py-2 text-right font-medium">Kredit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.lines.map((line, i) => (
                                <tr key={`${line.accountCode}-${i}`} className="border-b border-slate-800/60 last:border-0">
                                  <td className="py-2 pr-2 font-mono text-xs text-slate-400">{line.accountCode}</td>
                                  <td className="py-2 pr-2 text-slate-200">{line.accountName}</td>
                                  <td className="py-2 pr-2 text-right tabular-nums text-emerald-300">
                                    {line.debit > 0 ? formatCurrencyRp(line.debit) : ""}
                                  </td>
                                  <td className="py-2 text-right tabular-nums text-red-300">
                                    {line.credit > 0 ? formatCurrencyRp(line.credit) : ""}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 border-t border-line pt-4">
                  <p className="text-xs text-slate-400">
                    Resolusi mengirim jurnal ke antrian <span className="text-amber-300">Review Junior</span> untuk diproses ulang (EXCEPTION → JUNIOR_REVIEW).
                  </p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Catatan resolusi (mis. Faktur PPN sudah dilengkapi klien)…"
                    className="min-h-[70px] w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-yellow-400/60 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => void resolve(item.id)}
                      disabled={busy || !note.trim()}
                      className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? "Menyelesaikan…" : "Selesaikan Exception"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
