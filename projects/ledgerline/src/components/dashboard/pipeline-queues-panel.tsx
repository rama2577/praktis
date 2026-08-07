"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PipelineData } from "@/server/dashboard";
import { StatusBadge } from "@/components/ui/status-badge";

const STAGE_STYLE: Record<string, { box: string; label: string }> = {
  draft: { box: "border-slate-600 bg-slate-800/50", label: "text-slate-200" },
  ruleEngine: { box: "border-yellow-400/30 bg-yellow-400/5", label: "text-yellow-400" },
  junior: { box: "border-amber-500/30 bg-amber-500/5", label: "text-amber-300" },
  senior: { box: "border-yellow-400/30 bg-yellow-400/5", label: "text-yellow-400" },
  tax: { box: "border-sky-500/30 bg-sky-500/5", label: "text-sky-300" },
};

const QUEUE_TONE: Record<string, "warning" | "accent" | "neutral" | "danger"> = {
  JUNIOR: "warning",
  SENIOR: "accent",
  TAX: "neutral",
  PARTNER: "danger",
};

const QUEUE_LABEL: Record<string, string> = {
  JUNIOR: "Review Junior",
  SENIOR: "Review Senior",
  TAX: "Review Pajak",
  PARTNER: "Persetujuan Partner",
};

const POLL_MS = 30_000;

export function PipelineQueuesPanel({ initial }: { initial: PipelineData }) {
  const [data, setData] = useState<PipelineData>(initial);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: PipelineData };
      setData(json.data);
      setLastSync(new Date());
      setError(null);
    } catch {
      setError("Sinkronisasi gagal — data mungkin tertinggal.");
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-100">Pipeline Produksi</h2>
        <span className="text-xs text-slate-500">
          {error ?? `auto-refresh · ${lastSync.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
        </span>
      </div>

      {/* 5 stage pipeline */}
      <div className="flex flex-wrap items-stretch gap-2">
        {data.stages.map((stage, i) => {
          const style = STAGE_STYLE[stage.key] ?? STAGE_STYLE.draft;
          return (
            <div key={stage.key} className="flex items-center gap-2">
              <Link
                href="/dashboard/queues"
                title={`Lihat antrian — ${stage.label}`}
                className={`min-w-[9.5rem] flex-1 rounded-xl border p-4 transition hover:border-slate-500 ${style.box}`}
              >
                <p className={`text-xs font-medium uppercase tracking-wider ${style.label}`}>{stage.label}</p>
                <p className="mt-1.5 text-3xl font-semibold tabular-nums text-slate-100">{stage.count}</p>
                <p className="mt-1 truncate text-[11px] text-slate-400">{stage.hint}</p>
              </Link>
              {i < data.stages.length - 1 && (
                <span aria-hidden className="text-slate-600">
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Review queues per role */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium text-slate-100">Antrian Review</h2>
          <Link href="/dashboard/queues" className="text-xs text-yellow-400 hover:underline">
            Buka semua antrian →
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          {data.queues.length === 0 ? (
            <p className="bg-card/40 p-5 text-sm text-slate-400">Tidak ada antrian pending.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.queues.map((q) => (
                <li key={q.stage}>
                  <Link
                    href="/dashboard/queues"
                    className="flex items-center justify-between gap-3 bg-card/40 px-4 py-3 transition hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge label={QUEUE_LABEL[q.stage]} tone={QUEUE_TONE[q.stage] ?? "neutral"} />
                      {q.urgent > 0 && <StatusBadge label={`${q.urgent} urgent`} tone="danger" />}
                    </div>
                    <span className="text-sm tabular-nums text-slate-200">
                      {q.pending} menunggu
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
