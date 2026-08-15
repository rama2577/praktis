"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TH, TD, TR, Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

type Client = { id: string; name: string };

type Template = {
  id: string;
  name: string;
  kind: string;
  description?: string;
  dimensions: { project?: string; channel?: string };
  groupBy?: "project" | "channel" | null;
  period: string;
  createdAt: string;
};

type Suggestion = {
  name: string;
  kind: string;
  description: string;
  dimensions: { project?: string; channel?: string };
  groupBy: "project" | "channel" | null;
  columns: string[];
  confidence: number;
  reasons: string[];
};

type ReportRow = { label: string; amount: number };

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const KIND_LABEL: Record<string, string> = {
  LABA_RUGI: "Laba Rugi",
  NERACA: "Neraca",
  ARUS_KAS: "Arus Kas",
  PENJUALAN: "Penjualan",
  BEBAN: "Beban",
  PENDAPATAN_PER_PROYEK: "Pendapatan per Proyek",
  BEBAN_PER_CHANNEL: "Beban per Channel",
  PENJUALAN_PER_CHANNEL: "Penjualan per Channel",
};

export function CustomReportView({ initialClients = [] }: { initialClients?: Client[] }) {
  const clients = initialClients;
  const [clientId, setClientId] = useState(initialClients[0]?.id ?? "");
  const [period, setPeriod] = useState("2026-08");
  const [prompt, setPrompt] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/custom-reports?period=${period}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal memuat template.");
      setTemplates(j.data.templates ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [clientId, period]);

  useEffect(() => {
    if (!clientId) return;
    async function start() {
      setRows(null);
      setActiveTemplate(null);
      await loadTemplates();
    }
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, period]);

  const suggest = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/custom-reports/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), period }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menyusun struktur.");
      setSuggestion(j.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!suggestion) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/custom-reports/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestion.name,
          kind: suggestion.kind,
          description: suggestion.description,
          dimensions: suggestion.dimensions,
          groupBy: suggestion.groupBy,
          period,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan template.");
      setNotice("Template disetujui & disimpan.");
      setSuggestion(null);
      await loadTemplates();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const run = async (template: Template) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/custom-reports?period=${period}&templateId=${template.id}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menjalankan laporan.");
      setRows(j.data.rows);
      setActiveTemplate(template);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (template: Template) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/custom-reports/templates/${template.id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menghapus template.");
      setNotice("Template dihapus.");
      if (activeTemplate?.id === template.id) {
        setRows(null);
        setActiveTemplate(null);
      }
      await loadTemplates();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = (template: Template) => {
    if (!clientId) return;
    window.location.href = `/api/clients/${clientId}/custom-reports?period=${period}&templateId=${template.id}&format=csv`;
  };

  const total = useMemo(() => rows?.reduce((s, r) => s + r.amount, 0) ?? 0, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Laporan Custom AI</h1>
        <p className="text-sm text-slate-700">
          Minta laporan dalam bahasa natural → AI usulkan struktur → setujui → simpan sebagai template → jalankan & unduh.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Klien
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Periode
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
          />
        </label>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-600">
          {notice}
        </div>
      )}
      {error && <ErrorState message={error} />}

      <Card className="p-4">
        <h2 className="mb-2 font-display text-base font-semibold text-slate-900">✨ Minta Laporan</h2>
        <p className="mb-3 text-xs text-slate-700">
          Contoh: &quot;laba rugi Agustus 2026&quot;, &quot;penjualan per proyek Proyek A&quot;, &quot;beban per channel online&quot;
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void suggest();
            }}
            placeholder='Contoh: "pendapatan per proyek"'
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-700"
          />
          <Button onClick={() => void suggest()} disabled={busy || !prompt.trim()}>
            Usulkan Struktur
          </Button>
        </div>

        {suggestion && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-amber-700">{suggestion.name}</h3>
              <Badge label={KIND_LABEL[suggestion.kind] ?? suggestion.kind} tone="accent" />
              <Badge label={`${Math.round(suggestion.confidence * 100)}% yakin`} tone="positive" />
            </div>
            <p className="mt-2 text-sm text-slate-700">{suggestion.description}</p>
            {suggestion.dimensions?.project && (
              <p className="mt-1 text-xs text-slate-700">Filter proyek: {suggestion.dimensions.project}</p>
            )}
            {suggestion.dimensions?.channel && (
              <p className="mt-1 text-xs text-slate-700">Filter channel: {suggestion.dimensions.channel}</p>
            )}
            <p className="mt-1 text-xs text-slate-700">Kolom: {suggestion.columns.join(", ")}</p>
            <p className="mt-1 text-xs text-slate-700">Alasan: {suggestion.reasons.join("; ")}</p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => void approve()} disabled={busy}>
                ✓ Setujui & Simpan Template
              </Button>
              <Button variant="ghost" onClick={() => setSuggestion(null)} disabled={busy}>
                Batal
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold text-slate-900">Template Tersimpan ({templates.length})</h2>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : templates.length === 0 ? (
          <EmptyState title="Belum ada template" description="Minta laporan di atas lalu setujui usulan AI." />
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{t.name}</span>
                    <Badge label={KIND_LABEL[t.kind] ?? t.kind} />
                    {t.dimensions?.project && <Badge label={`Proyek: ${t.dimensions.project}`} tone="warning" />}
                    {t.dimensions?.channel && <Badge label={`Channel: ${t.dimensions.channel}`} tone="warning" />}
                  </div>
                  {t.description && <p className="mt-0.5 text-xs text-slate-700">{t.description}</p>}
                </div>
                <Button size="sm" onClick={() => void run(t)} disabled={busy}>
                  Jalankan
                </Button>
                <Button size="sm" variant="secondary" onClick={() => exportCsv(t)}>
                  ↓ CSV
                </Button>
                <Button size="sm" variant="danger" onClick={() => void remove(t)} disabled={busy}>
                  Hapus
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {rows && activeTemplate && (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-slate-900">{activeTemplate.name}</h2>
            <Badge label={period} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <TR>
                  <TH>Label</TH>
                  <TH className="text-right">Jumlah</TH>
                </TR>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <TR key={`${r.label}-${i}`}>
                    <TD className={r.label.includes("TOTAL") || r.label.includes("LABA") ? "font-semibold text-slate-900" : ""}>
                      {r.label}
                    </TD>
                    <TD className={`text-right ${r.amount < 0 ? "text-rose-600" : "text-slate-800"}`}>{fmt(r.amount)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
          <p className="mt-3 text-right text-sm text-slate-700">
            Total: <span className="font-semibold text-slate-900">{fmt(total)}</span>
          </p>
        </Card>
      )}
    </div>
  );
}
