"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { stageBadge, stageLabel, STAGE_ORDER } from "@/components/queues/stage-meta";
import { formatCurrencyRp } from "@/lib/format";

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
    }>;
  };
};

type QueueResponse = { data: QueueTask[]; summary: Record<string, number>; isAdmin: boolean };

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
  const [action, setAction] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

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
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, QueueTask[]>();
    for (const t of data?.data ?? []) {
      const arr = map.get(t.stage) ?? [];
      arr.push(t);
      map.set(t.stage, arr);
    }
    return STAGE_ORDER.filter((s) => map.has(s)).map((s) => ({ stage: s, tasks: map.get(s)! }));
  }, [data]);

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

  if (loading) {
    return <p className="text-sm text-slate-400">Memuat antrian…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }
  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">
        Antrian kosong — tidak ada jurnal menunggu review Anda saat ini.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {flash && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {flash}
        </div>
      )}

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
                        setNote("");
                        setAction(null);
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
                    >
                      {openTaskId === task.id ? "Tutup" : "Review"}
                    </button>
                  </div>
                </div>

                {openTaskId === task.id && (
                  <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Kode</th>
                            <th className="px-3 py-2">Akun</th>
                            <th className="px-3 py-2 text-right">Debit</th>
                            <th className="px-3 py-2 text-right">Kredit</th>
                            <th className="px-3 py-2">Ref. PSAK</th>
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

                    <div className="space-y-3">
                      <textarea
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
                          Setujui ✓
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => submitAction(task.id, "return")}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          Kembalikan ↩
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => submitAction(task.id, "reject")}
                          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Tolak ✕
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
