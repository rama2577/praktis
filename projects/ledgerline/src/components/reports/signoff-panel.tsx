/**
 * Sign-off Panel — status & approval buttons untuk laporan keuangan.
 * Draft → In Review → Approved → Delivered (Big 4 workflow).
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getWorkflowStatus, STATUS_LABELS, STATUS_TONES } from "@/server/signoff";
import type { SnapshotMeta } from "@/server/signoff";

export function SignoffPanel({
  clientId, period, type,
}: {
  clientId: string;
  period: string;
  type: string; // "TRIAL_BALANCE" | "ANNUAL_REPORT" etc
}) {
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const qkey = ["report-snapshots", clientId, period, type];

  const { data: snapshot, isLoading } = useQuery({
    queryKey: qkey,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/report-snapshots?period=${period}`);
      if (!res.ok) return null;
      const { data } = await res.json() as { data: SnapshotMeta[] };
      return data.find((s) => s.type === type) ?? null;
    },
    enabled: !!clientId,
  });

  const action = useMutation({
    mutationFn: async (act: string) => {
      if (!snapshot) throw new Error("Tidak ada snapshot");
      const res = await fetch(`/api/clients/${clientId}/report-snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId: snapshot.id, action: act }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Gagal" }))).error ?? "Gagal");
      return (await res.json()) as { data: SnapshotMeta };
    },
    onSuccess: ({ data }) => {
      queryClient.setQueryData(qkey, data);
      setMessage(`✅ Status: ${STATUS_LABELS[data.status]}`);
    },
    onError: (e) => setMessage(`❌ ${(e as Error).message}`),
  });

  if (isLoading) return <div className="text-xs text-slate-700">Memuat status…</div>;

  if (!snapshot) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100/30 px-3 py-2">
        <Badge label="Belum ada" tone="neutral" />
        <span className="text-xs text-slate-700">Simpan laporan untuk mulai workflow</span>
      </div>
    );
  }

  const ws = getWorkflowStatus(snapshot.status);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge label={`v${snapshot.version}`} tone="neutral" />
        <Badge label={ws.label} tone={STATUS_TONES[snapshot.status]} />
        {snapshot.reviewedBy && (
          <span className="text-xs text-slate-700">Review: {snapshot.reviewedBy}</span>
        )}
        {snapshot.approvedBy && (
          <span className="text-xs text-slate-700">Approval: {snapshot.approvedBy}</span>
        )}
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1 text-xs text-slate-700">
        <Timeline active={!!snapshot} label="Draft" />
        <span className="text-slate-700">→</span>
        <Timeline active={snapshot.status !== "DRAFT"} label="Review" />
        <span className="text-slate-700">→</span>
        <Timeline active={snapshot.status === "APPROVED" || snapshot.status === "DELIVERED"} label="Approve" />
        <span className="text-slate-700">→</span>
        <Timeline active={snapshot.status === "DELIVERED"} label="Deliver" />
      </div>

      {/* Actions */}
      {!ws.isFinal && (
        <div className="flex flex-wrap gap-2">
          {ws.canSubmit && (
            <button onClick={() => action.mutate("submit")} disabled={action.isPending}
              className="rounded border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs text-accent hover:bg-accent/20 disabled:opacity-50"
            >{action.isPending ? "…" : "Submit for Review"}</button>
          )}
          {ws.canApprove && (
            <>
              <button onClick={() => action.mutate("approve")} disabled={action.isPending}
                className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-600 hover:bg-emerald-400/20 disabled:opacity-50"
              >{action.isPending ? "…" : "✓ Approve"}</button>
              <button onClick={() => action.mutate("reject")} disabled={action.isPending}
                className="rounded border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-400/20 disabled:opacity-50"
              >{action.isPending ? "…" : "✗ Reject"}</button>
            </>
          )}
          {ws.canDeliver && (
            <button onClick={() => action.mutate("deliver")} disabled={action.isPending}
              className="rounded border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-600 hover:bg-sky-400/20 disabled:opacity-50"
            >{action.isPending ? "…" : "📤 Deliver ke Klien"}</button>
          )}
        </div>
      )}

      {message && <p className={`text-xs ${message.startsWith("✅") ? "text-emerald-600" : "text-rose-600"}`}>{message}</p>}
    </div>
  );
}

function Timeline({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={active ? "text-accent" : "text-slate-700"}>
      {active ? "●" : "○"} {label}
    </span>
  );
}
