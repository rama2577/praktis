/**
 * Sign-off Panel — status & approval buttons untuk laporan keuangan.
 * Draft → In Review → Approved → Delivered (Big 4 workflow).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
type ReportSnapshotStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "DELIVERED";
import { getWorkflowStatus, STATUS_LABELS, STATUS_TONES } from "@/server/signoff";
import type { SnapshotMeta } from "@/server/signoff";

export function SignoffPanel({
  clientId, period, type,
}: {
  clientId: string;
  period: string;
  type: string; // "TRIAL_BALANCE" | "ANNUAL_REPORT" etc
}) {
  const [snapshot, setSnapshot] = useState<SnapshotMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/report-snapshots?period=${period}`);
      if (!res.ok) return;
      const { data } = await res.json() as { data: SnapshotMeta[] };
      const match = data.find((s) => s.type === type);
      setSnapshot(match ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [clientId, period, type]);

  useEffect(() => { void load(); }, [load]);

  const action = async (act: string) => {
    if (!snapshot) return;
    setActing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/report-snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId: snapshot.id, action: act }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Gagal" }))).error ?? "Gagal");
      const { data } = await res.json() as { data: SnapshotMeta };
      setSnapshot(data);
      setMessage(`✅ Status: ${STATUS_LABELS[data.status]}`);
    } catch (e) {
      setMessage(`❌ ${(e as Error).message}`);
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="text-xs text-slate-700">Memuat status…</div>;

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
            <button onClick={() => void action("submit")} disabled={acting}
              className="rounded border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1 text-xs text-amber-600 hover:bg-yellow-400/20 disabled:opacity-50"
            >{acting ? "…" : "Submit for Review"}</button>
          )}
          {ws.canApprove && (
            <>
              <button onClick={() => void action("approve")} disabled={acting}
                className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-600 hover:bg-emerald-400/20 disabled:opacity-50"
              >{acting ? "…" : "✓ Approve"}</button>
              <button onClick={() => void action("reject")} disabled={acting}
                className="rounded border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-400/20 disabled:opacity-50"
              >{acting ? "…" : "✗ Reject"}</button>
            </>
          )}
          {ws.canDeliver && (
            <button onClick={() => void action("deliver")} disabled={acting}
              className="rounded border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-600 hover:bg-sky-400/20 disabled:opacity-50"
            >{acting ? "…" : "📤 Deliver ke Klien"}</button>
          )}
        </div>
      )}

      {message && <p className={`text-xs ${message.startsWith("✅") ? "text-emerald-600" : "text-rose-600"}`}>{message}</p>}
    </div>
  );
}

function Timeline({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={active ? "text-amber-600" : "text-slate-700"}>
      {active ? "●" : "○"} {label}
    </span>
  );
}
