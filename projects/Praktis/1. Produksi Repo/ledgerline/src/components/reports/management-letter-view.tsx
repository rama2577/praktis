/**
 * Management Letter View — surat kepada manajemen (Big 4 standard).
 * Menampilkan temuan, rekomendasi, severity, dan status dalam format profesional.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectClient, PeriodInput } from "./analytics-views";
import type { ManagementLetter, Finding, Severity } from "@/server/management-letter";

type Client = { id: string; name: string };

const SEV_META: Record<Severity, { label: string; tone: "danger" | "warning" | "positive" | "neutral"; emoji: string }> = {
  HIGH: { label: "Prioritas Tinggi", tone: "danger", emoji: "🔴" },
  MEDIUM: { label: "Prioritas Sedang", tone: "warning", emoji: "🟡" },
  LOW: { label: "Prioritas Rendah", tone: "positive", emoji: "🟢" },
  OBSERVATION: { label: "Observasi", tone: "neutral", emoji: "ℹ️" },
};

const AREA_META: Record<string, string> = {
  ACCOUNTING: "Akuntansi",
  INTERNAL_CONTROL: "Pengendalian Internal",
  TAX: "Pajak",
  PROCESS: "Proses",
  IT: "Teknologi Informasi",
  GENERAL: "Umum",
};

export function ManagementLetterView({
  clients, period, clientId, setClientId, setPeriod,
}: {
  clients: Client[];
  period: string;
  clientId: string;
  setClientId: (v: string) => void;
  setPeriod: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: ml, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["management-letter", clientId, period],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/management-letter?period=${period}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Gagal" }))).error ?? "Gagal");
      const { data } = await res.json() as { data: ManagementLetter };
      return data;
    },
    enabled: !!clientId,
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportUrl = (fmt: string) =>
    clientId ? `/api/clients/${clientId}/management-letter?period=${period}&format=${fmt}` : "#";

  if (!clientId) return <EmptyState title="Pilih klien" description="Pilih klien dan periode untuk generate Management Letter." />;

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <SelectClient clients={clients} clientId={clientId} setClientId={setClientId} />
        <PeriodInput period={period} setPeriod={setPeriod} />
        <a href={exportUrl("md")} aria-disabled={!clientId}
          className={`rounded-lg border px-3 py-2 text-sm transition ${clientId ? "border-slate-200 text-slate-800 hover:border-accent/50" : "pointer-events-none opacity-40"}`}
        >↓ Markdown</a>
        <a href={exportUrl("pdf")} aria-disabled={!clientId}
          className={`rounded-lg border px-3 py-2 text-sm transition ${clientId ? "border-slate-200 text-slate-800 hover:border-accent/50" : "pointer-events-none opacity-40"}`}
        >↓ PDF</a>
        <a href={exportUrl("xlsx")} aria-disabled={!clientId}
          className={`rounded-lg border px-3 py-2 text-sm transition ${clientId ? "border-slate-200 text-slate-800 hover:border-accent/50" : "pointer-events-none opacity-40"}`}
        >↓ XLSX</a>
        <a href={exportUrl("csv")} aria-disabled={!clientId}
          className={`rounded-lg border px-3 py-2 text-sm transition ${clientId ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20" : "pointer-events-none opacity-40"}`}
        >↓ CSV</a>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}
      {loading && <Skeleton className="h-64 w-full" />}

      {!loading && !error && ml && (
        <>
          {/* Header */}
          <Card className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">Surat Kepada Manajemen</h3>
                <p className="text-sm text-slate-700">Management Letter — Standar Big 4</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ml.summary.high > 0 && <Badge label={`${ml.summary.high} Tinggi`} tone="danger" />}
                {ml.summary.medium > 0 && <Badge label={`${ml.summary.medium} Sedang`} tone="warning" />}
                {ml.summary.low > 0 && <Badge label={`${ml.summary.low} Rendah`} tone="positive" />}
                {ml.summary.resolved > 0 && <Badge label={`${ml.summary.resolved} Selesai`} tone="positive" />}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-700 sm:grid-cols-3">
              <div><span className="font-medium text-slate-700">Kepada:</span> {ml.preparedFor}</div>
              <div><span className="font-medium text-slate-700">Dari:</span> {ml.preparedBy}</div>
              <div><span className="font-medium text-slate-700">Tanggal:</span> {ml.date}</div>
              <div><span className="font-medium text-slate-700">Referensi:</span> {ml.reference}</div>
              <div><span className="font-medium text-slate-700">Periode:</span> {ml.period}</div>
            </div>
          </Card>

          {/* Executive Summary */}
          <Card className="p-5">
            <h4 className="mb-2 text-sm font-medium text-slate-800">1. Ringkasan Eksekutif</h4>
            <p className="text-sm text-slate-700">{ml.executiveSummary}</p>
          </Card>

          {/* Scope */}
          <Card className="p-5">
            <h4 className="mb-2 text-sm font-medium text-slate-800">2. Ruang Lingkup & Pendekatan</h4>
            <p className="text-sm text-slate-700">{ml.scope}</p>
          </Card>

          {/* Summary */}
          <Card className="p-5">
            <h4 className="mb-3 text-sm font-medium text-slate-800">3. Ikhtisar Temuan ({ml.summary.total})</h4>
            <div className="flex flex-wrap gap-3">
              {Object.entries(SEV_META).map(([sev, meta]) => {
                const count = ml.summary[sev.toLowerCase() as keyof typeof ml.summary] as number;
                return (
                  <div key={sev} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100/30 px-3 py-2">
                    <span>{meta.emoji}</span>
                    <span className="text-sm text-slate-700">{count}</span>
                    <span className="text-xs text-slate-700">{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Findings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-800">4. Temuan & Rekomendasi</h4>
            {(Object.keys(SEV_META) as Severity[]).map((sev) => {
              const fList = ml.findings.filter((f) => f.severity === sev);
              if (fList.length === 0) return null;
              return (
                <div key={sev} className="space-y-2">
                  <h5 className="text-xs font-medium text-slate-700">{SEV_META[sev].emoji} {SEV_META[sev].label} ({fList.length})</h5>
                  {fList.map((f) => (
                    <FindingCard key={f.id} finding={f} expanded={expanded.has(f.id)} onToggle={() => toggle(f.id)} />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Closing */}
          <Card className="border-accent/20 bg-accent/5 p-5">
            <h4 className="mb-2 text-sm font-medium text-slate-800">5. Tindak Lanjut & Rekomendasi</h4>
            <ul className="space-y-1 text-sm text-slate-700">
              {ml.narrative.map((n, i) => <li key={i}>• {n}</li>)}
            </ul>
            <p className="mt-4 text-xs text-slate-700">
              Surat ini dibuat berdasarkan data yang tersedia dalam sistem Praktis per tanggal pelaporan.
              Manajemen bertanggung jawab untuk meninjau, menanggapi, dan menindaklanjuti setiap temuan.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Finding Card ─────────────────────────────────────────────────────────────

function FindingCard({ finding, expanded, onToggle }: { finding: Finding; expanded: boolean; onToggle: () => void }) {
  const sev = SEV_META[finding.severity];
  return (
    <div
      className={`cursor-pointer rounded-xl border transition ${
        expanded ? "border-accent/30 bg-slate-100" : "border-slate-200 bg-white hover:border-slate-200"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-700">{finding.id}</span>
            <Badge label={AREA_META[finding.area] || finding.area} tone="neutral" />
            <Badge label={sev.label} tone={sev.tone} />
            {finding.status === "RESOLVED" && <Badge label="✓ Selesai" tone="positive" />}
          </div>
          <p className="mt-1 text-sm font-medium text-slate-800">{finding.title}</p>
        </div>
        <span className="text-xs text-slate-700">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 px-4 py-3 space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-700">Deskripsi</p>
            <p className="text-slate-700">{finding.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700">Dampak</p>
            <p className="text-slate-700">{finding.impact}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-600">Rekomendasi</p>
            <p className="text-slate-700">{finding.recommendation}</p>
          </div>
          {finding.managementResponse && (
            <div>
              <p className="text-xs font-medium text-accent">Tanggapan Manajemen</p>
              <p className="text-slate-700">{finding.managementResponse}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
