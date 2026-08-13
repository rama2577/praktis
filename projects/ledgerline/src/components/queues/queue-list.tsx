"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { stageBadge, stageLabel, STAGE_ORDER } from "@/components/queues/stage-meta";
import { JournalLinesEditor } from "@/components/queues/journal-lines-editor";
import { formatCurrencyRp } from "@/lib/format";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type QueueTask = {
  id: string;
  stage: string;
  urgent: boolean;
  dueAt: string;
  createdAt: string;
  journalEntry: {
    id: string;
    description: string;
    status: string;
    confidence: number;
    source: string;
    document: { fileName: string; type: string } | null;
    client: { id: string; name: string };
    lines: Array<{
      id: string;
      accountCode: string;
      accountName: string;
      debit: string;
      credit: string;
      psakRef: string;
      notes?: string | null;
    }>;
  };
};

type QueueResponse = { data: QueueTask[]; summary: Record<string, number>; isAdmin: boolean };

/** EN-06 — ambang batch approve (sinkron dengan server: BATCH_APPROVE_CONFIDENCE_MIN). */
const BATCH_CONFIDENCE_MIN = 0.85;

function formatDue(dueAt: string): string {
  const due = new Date(dueAt);
  const now = Date.now();
  const diffMin = Math.round((due.getTime() - now) / 60_000);
  if (diffMin <= 0) return "Terlambat";
  if (diffMin < 60) return `${diffMin} mnt`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `${h}j${m > 0 ? ` ${m}m` : ""}`;
}

function formatIdr(value: string): string {
  return formatCurrencyRp(Number(value));
}

export function QueueList() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [, setAction] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  // Filter klien: akuntan memilih 1 klien agar tabel kerja tidak menampilkan semua klien.
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientFilter, setClientFilter] = useState("");

  // Auto-focus note textarea saat panel review terbuka
  useEffect(() => {
    if (openTaskId && noteRef.current) {
      noteRef.current.focus();
    }
  }, [openTaskId]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/queues", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal memuat antrian");
      const json = (await res.json()) as QueueResponse;
      setData(json);
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
      try {
        const res = await fetch("/api/clients", { cache: "no-store" });
        if (res.ok) {
          const j = (await res.json()) as { data?: { id: string; name: string }[] };
          setClients(j.data ?? []);
        }
      } catch {
        // filter klien opsional — abaikan bila gagal
      }
    }
    void start();
  }, [load]);

  // EN-06: Batch approve — task terpilih (confidence ≥ ambang)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const submitBatch = useCallback(async () => {
    if (selected.size === 0) return;
    setBatchBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/reviews/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: [...selected] }),
      });
      const json = (await res.json()) as {
        data?: { approved: number; skipped: number; threshold: number };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Batch gagal");
      const { approved, skipped, threshold } = json.data!;
      setFlash(
        skipped > 0
          ? `✅ ${approved} disetujui · ${skipped} dilewati (confidence < ${Math.round(threshold * 100)}%)`
          : `✅ ${approved} jurnal disetujui sekaligus`,
      );
      setSelected(new Set());
      setOpenTaskId(null);
      setNote("");
      await load();
    } catch (e) {
      setFlash(`Gagal: ${(e as Error).message}`);
    } finally {
      setBatchBusy(false);
    }
  }, [selected, load]);

  const grouped = useMemo(() => {
    const map = new Map<string, QueueTask[]>();
    for (const t of data?.data ?? []) {
      if (clientFilter && t.journalEntry.client.id !== clientFilter) continue;
      const arr = map.get(t.stage) ?? [];
      arr.push(t);
      map.set(t.stage, arr);
    }
    return STAGE_ORDER.filter((s) => map.has(s)).map((s) => ({ stage: s, tasks: map.get(s)! }));
  }, [data, clientFilter]);

  const submitAction = useCallback(
    async (taskId: string, a: string) => {
      setBusy(true);
      setFlash(null);
      try {
        const res = await fetch(`/api/reviews/${taskId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: a, note: note.trim() || undefined }),
        });
        const json = (await res.json()) as { message?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Aksi gagal");
        setFlash(json.message ?? "Berhasil");
        setOpenTaskId(null);
        setNote("");
        setAction(null);
        await load();
      } catch (e) {
        setFlash(`Gagal: ${(e as Error).message}`);
      } finally {
        setBusy(false);
      }
    },
    [load, note],
  );

  // EN-06: Keyboard shortcuts — review jurnal tanpa mouse (nonaktif saat mode edit)
  useEffect(() => {
    if (!openTaskId || busy || editTaskId) return;
    const handler = (e: KeyboardEvent) => {
      const isTextarea = e.target instanceof HTMLTextAreaElement;
      if (isTextarea && e.key !== "Escape") return;
      switch (e.key) {
        case "a": case "A": e.preventDefault(); void submitAction(openTaskId, "approve"); break;
        case "r": case "R": e.preventDefault(); void submitAction(openTaskId, "return"); break;
        case "x": case "X": e.preventDefault(); void submitAction(openTaskId, "reject"); break;
        case "Escape": e.preventDefault(); setOpenTaskId(null); setNote(""); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openTaskId, busy, editTaskId, submitAction]);

  if (loading) {
    return <SkeletonList rows={3} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />;
  }
  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        icon="🗂️"
        title="Antrian kosong"
        description="Tidak ada jurnal yang menunggu review Anda saat ini. Unggah dokumen klien untuk memulai pipeline AI."
      />
    );
  }

  return (
    <div className="space-y-8">
      {flash && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {flash}
        </div>
      )}

      {/* EN-06: Batch approve bar — muncul saat ada task terpilih */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-400/40 bg-slate-900/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-sm text-slate-200">
            <span className="font-semibold text-yellow-400">{selected.size}</span> task dipilih · confidence ≥{" "}
            {Math.round(BATCH_CONFIDENCE_MIN * 100)}%
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={batchBusy}
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={batchBusy}
              onClick={() => void submitBatch()}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-yellow-300 disabled:opacity-50"
            >
              {batchBusy ? "Memproses…" : `Setujui ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      {/* Filter klien — agar tidak semua klien tampil dalam satu tabel kerja */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Sortir klien
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-yellow-400/50 focus:outline-none"
          >
            <option value="">Semua klien ({data?.data.length ?? 0})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        {clientFilter && (
          <button
            type="button"
            onClick={() => setClientFilter("")}
            className="mt-4 rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            ✕ Hapus filter
          </button>
        )}
        <p className="mt-4 text-xs text-slate-500">
          💡 Batch approve: centang task dengan confidence ≥ {Math.round(BATCH_CONFIDENCE_MIN * 100)}%, lalu setujui
          sekaligus — tetap lewat state machine & tercatat di SLA/aktivitas.
        </p>
      </div>

      {grouped.map(({ stage, tasks }) => (
        <section key={stage}>
          <div className="mb-3 flex items-center gap-3">
            {stageBadge(stage)}
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{tasks.length}</span>
          </div>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-xl border bg-slate-900/60 p-4 transition-colors ${
                  task.urgent ? "border-red-500/40" : "border-slate-800"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${task.journalEntry.client.name} — ${task.journalEntry.description}`}
                        checked={selected.has(task.id)}
                        disabled={task.journalEntry.confidence < BATCH_CONFIDENCE_MIN}
                        onChange={() => toggleSelect(task.id)}
                        title={
                          task.journalEntry.confidence < BATCH_CONFIDENCE_MIN
                            ? `Confidence di bawah ambang batch (${Math.round(BATCH_CONFIDENCE_MIN * 100)}%)`
                            : "Pilih untuk batch approve"
                        }
                        className="h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-800 accent-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                      <span className="font-medium text-slate-100">{task.journalEntry.client.name}</span>
                      {task.urgent && <StatusBadge label="Urgent" tone="danger" />}
                      <StatusBadge
                        label={`${Math.round(task.journalEntry.confidence * 100)}% keyakinan AI`}
                        tone={task.journalEntry.confidence >= 0.7 ? "positive" : "warning"}
                      />
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{task.journalEntry.description}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {task.journalEntry.document?.fileName ?? "Tanpa dokumen"} · Tahap: {stageLabel(stage)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="text-xs text-slate-400">
                      <div>Tenggat</div>
                      <div className={task.dueAt && new Date(task.dueAt).getTime() <= Date.now() ? "font-semibold text-red-400" : "text-slate-200"}>
                        {formatDue(task.dueAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOpenTaskId(openTaskId === task.id ? null : task.id);
                        setEditTaskId(null);
                        setNote("");
                        setAction(null);
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
                    >
                      {openTaskId === task.id ? "Tutup" : "Review"}
                    </button>
                    <button
                      onClick={() => {
                        setEditTaskId(editTaskId === task.id ? null : task.id);
                        setOpenTaskId(null);
                        setNote("");
                        setAction(null);
                      }}
                      className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-300 hover:bg-sky-500/20"
                    >
                      {editTaskId === task.id ? "Tutup Edit" : "✏️ Edit"}
                    </button>
                  </div>
                </div>

                {editTaskId === task.id && (
                  <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                    <JournalLinesEditor
                      taskId={task.id}
                      initialLines={task.journalEntry.lines}
                      onSaved={(message) => {
                        setFlash(message);
                        setEditTaskId(null);
                        setOpenTaskId(null);
                        void load();
                      }}
                      onCancel={() => setEditTaskId(null)}
                    />
                  </div>
                )}

                {openTaskId === task.id && (
                  <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-400">
                          <tr>
                            <th scope="col" className="px-3 py-2">Kode</th>
                            <th scope="col" className="px-3 py-2">Akun</th>
                            <th scope="col" className="px-3 py-2 text-right">Debit</th>
                            <th scope="col" className="px-3 py-2 text-right">Kredit</th>
                            <th scope="col" className="px-3 py-2">Ref. PSAK</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {task.journalEntry.lines.map((l) => (
                            <tr key={l.id}>
                              <td className="px-3 py-2 font-mono text-xs text-slate-300">{l.accountCode}</td>
                              <td className="px-3 py-2 text-slate-200">{l.accountName}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-200">{l.debit !== "0" ? formatIdr(l.debit) : "–"}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-200">{l.credit !== "0" ? formatIdr(l.credit) : "–"}</td>
                              <td className="px-3 py-2 font-mono text-xs text-slate-400">{l.psakRef}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* EN-06: Shortcut bar */}
                    <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-1.5 text-[11px] text-slate-400">
                      <span className="text-slate-500">⌨️</span>
                      <span><kbd className="rounded bg-slate-700 px-1 py-0.5 text-[10px] text-slate-300">A</kbd> Setujui</span>
                      <span className="text-slate-600">·</span>
                      <span><kbd className="rounded bg-slate-700 px-1 py-0.5 text-[10px] text-slate-300">R</kbd> Kembalikan</span>
                      <span className="text-slate-600">·</span>
                      <span><kbd className="rounded bg-slate-700 px-1 py-0.5 text-[10px] text-slate-300">X</kbd> Tolak</span>
                      <span className="text-slate-600">·</span>
                      <span><kbd className="rounded bg-slate-700 px-1 py-0.5 text-[10px] text-slate-300">Esc</kbd> Tutup</span>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        ref={noteRef}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Catatan review (wajib untuk Tolak)…"
                        rows={2}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-yellow-400/50 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busy}
                          onClick={() => submitAction(task.id, "approve")}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Setujui <kbd className="ml-1 rounded bg-emerald-700 px-1 py-0.5 text-[10px]">A</kbd>
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => submitAction(task.id, "return")}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          Kembalikan <kbd className="ml-1 rounded border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[10px]">R</kbd>
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => submitAction(task.id, "reject")}
                          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Tolak <kbd className="ml-1 rounded border border-red-500/30 bg-red-500/10 px-1 py-0.5 text-[10px]">X</kbd>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
