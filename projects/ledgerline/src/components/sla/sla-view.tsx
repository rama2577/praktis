"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TH, TD, TR, Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

type SlaEvent = {
  id: string;
  stage: string;
  status: string;
  targetMinutes: number;
  actualMinutes: number | null;
  createdAt: string;
  journalDescription: string | null;
  clientName: string | null;
};

type StageStat = { stage: string; targetMinutes: number; avgMinutes: number | null; total: number; breached: number };

const STAGE_LABEL: Record<string, string> = {
  JUNIOR: "Review Junior",
  SENIOR: "Review Senior",
  TAX: "Review Pajak",
  PARTNER: "Persetujuan Partner",
};

const STATUS_LABEL: Record<string, { label: string; tone: "positive" | "warning" | "danger" | "neutral" }> = {
  MET: { label: "Tepat waktu", tone: "positive" },
  AT_RISK: { label: "Menjelang batas", tone: "warning" },
  BREACHED: { label: "Terlambat", tone: "danger" },
};

const fmtMin = (m: number | null) => (m === null ? "—" : `${m} mnt`);

export function SlaView() {
  const [events, setEvents] = useState<SlaEvent[]>([]);
  const [stageStats, setStageStats] = useState<StageStat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sla");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal memuat SLA.");
      setEvents(j.data.events);
      setStageStats(j.data.stageStats);
      setCounts(j.data.counts);
      setTargets(j.data.targets);
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

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Monitoring SLA</h1>
        <p className="text-sm text-slate-700">
          Service Level Agreement per tahap review — target waktu, rata-rata aktual, dan pelanggaran.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-slate-700">Tepat waktu</div>
          <div className="font-display text-xl font-bold text-emerald-600">{counts.MET ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-700">Menjelang batas</div>
          <div className="font-display text-xl font-bold text-amber-600">{counts.AT_RISK ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-700">Terlambat</div>
          <div className="font-display text-xl font-bold text-rose-600">{counts.BREACHED ?? 0}</div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900">Target per Tahap</h2>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <TR>
                <TH>Tahap</TH>
                <TH className="text-center">Target</TH>
                <TH className="text-center">Rata-rata aktual</TH>
                <TH className="text-center">Total</TH>
                <TH className="text-center">Terlambat</TH>
              </TR>
            </thead>
            <tbody>
              {stageStats.map((s) => (
                <TR key={s.stage}>
                  <TD>{STAGE_LABEL[s.stage] ?? s.stage}</TD>
                  <TD className="text-center">{fmtMin(s.targetMinutes)}</TD>
                  <TD className={`text-center ${s.avgMinutes !== null && s.avgMinutes > s.targetMinutes ? "text-rose-600" : "text-slate-800"}`}>
                    {fmtMin(s.avgMinutes)}
                  </TD>
                  <TD className="text-center">{s.total}</TD>
                  <TD className="text-center">{s.breached}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900">Riwayat Event ({events.length})</h2>
        {events.length === 0 ? (
          <EmptyState title="Belum ada event SLA" description="Event tercatat otomatis setiap task review diselesaikan." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <TR>
                  <TH>Waktu</TH>
                  <TH>Klien</TH>
                  <TH>Jurnal</TH>
                  <TH>Tahap</TH>
                  <TH className="text-center">Aktual / Target</TH>
                  <TH>Status</TH>
                </TR>
              </thead>
              <tbody>
                {events.map((e) => {
                  const st = STATUS_LABEL[e.status] ?? { label: e.status, tone: "neutral" as const };
                  return (
                    <TR key={e.id}>
                      <TD className="whitespace-nowrap text-slate-700">{e.createdAt.slice(0, 16).replace("T", " ")}</TD>
                      <TD>{e.clientName ?? "—"}</TD>
                      <TD className="max-w-[220px] truncate">{e.journalDescription ?? "—"}</TD>
                      <TD>{STAGE_LABEL[e.stage] ?? e.stage}</TD>
                      <TD className="text-center">
                        {fmtMin(e.actualMinutes)} / {fmtMin(e.targetMinutes)}
                      </TD>
                      <TD>
                        <Badge label={st.label} tone={st.tone} />
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
