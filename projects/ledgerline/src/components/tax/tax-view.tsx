"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrencyRp } from "@/lib/format";
import { TAX_CODE_OPTIONS } from "@/server/tax";
import type { TaxLine } from "@/server/tax";

type Summary = {
  period: string;
  clientName: string;
  lineCount: number;
  ppnOut: { dpp: number; ppn: number; rows: TaxLine[] };
  ppnIn: { dpp: number; ppn: number; rows: TaxLine[] };
  ppnInNonCreditable: { dpp: number; ppn: number; rows: TaxLine[] };
  pph23: { dpp: number; ppn: number; rows: TaxLine[] };
  pph42: { dpp: number; ppn: number; rows: TaxLine[] };
  pph21: { dpp: number; ppn: number; rows: TaxLine[] };
  pph22: { dpp: number; ppn: number; rows: TaxLine[] };
  pph25: { dpp: number; ppn: number; rows: TaxLine[] };
};

const EXPORT_TYPES = [
  { value: "spt1111", label: "SPT 1111 (PPN)" },
  { value: "spt1771", label: "SPT 1771 (Badan)" },
  { value: "ebupot23", label: "e-Bupot PPh 23" },
  { value: "pph42", label: "PPh 4(2)" },
  { value: "pph21", label: "PPh 21 Masa" },
];

export function TaxView({ clients }: { clients: { id: string; name: string }[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [lineOverrides, setLineOverrides] = useState<Record<string, { taxCode: string; taxBase: string }>>({});

  const load = useCallback(async (cid: string, per: string) => {
    if (!cid || !per) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${cid}/tax?period=${per}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal memuat data pajak");
      const data = ((await res.json()) as { data: Summary }).data;
      setSummary(data);
      const overrides: Record<string, { taxCode: string; taxBase: string }> = {};
      for (const bucket of [data.ppnOut, data.ppnIn, data.ppnInNonCreditable, data.pph23, data.pph42, data.pph21, data.pph22, data.pph25]) {
        for (const l of bucket.rows) {
          overrides[l.lineId] = {
            taxCode: l.taxCode ?? "",
            taxBase: l.taxBase === null ? "" : String(l.taxBase),
          };
        }
      }
      setLineOverrides(overrides);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function start() {
      await load(clientId, period);
    }
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, period]);

  const saveOverride = async (lineId: string) => {
    const ov = lineOverrides[lineId];
    if (!ov) return;
    setFlash(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/tax/lines/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxCode: ov.taxCode || null,
          taxBase: ov.taxBase === "" ? null : Number(ov.taxBase),
        }),
      });
      const json = (await res.json()) as { data?: { taxCode: string | null }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan");
      setFlash(`Kode pajak baris disimpan (${json.data?.taxCode ?? "tanpa kode"}).`);
      await load(clientId, period);
    } catch (e) {
      setFlash(`Gagal: ${(e as Error).message}`);
    }
  };

  const allRows = summary
    ? [
        ...summary.ppnOut.rows,
        ...summary.ppnIn.rows,
        ...summary.ppnInNonCreditable.rows,
        ...summary.pph23.rows,
        ...summary.pph42.rows,
        ...summary.pph21.rows,
        ...summary.pph22.rows,
        ...summary.pph25.rows,
      ]
    : [];

  return (
    <div className="space-y-6">
      {flash && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {flash}
        </div>
      )}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Klien
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:border-yellow-400/60 focus:outline-none"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Periode
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:border-yellow-400/60 focus:outline-none"
          />
        </label>
        <button
          onClick={() => void load(clientId, period)}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-yellow-400/50 hover:text-yellow-300"
        >
          Muat
        </button>
        <div className="flex flex-wrap gap-2">
          {EXPORT_TYPES.map((t) => (
            <a
              key={t.value}
              href={`/api/clients/${clientId}/tax/export?period=${period}&type=${t.value}`}
              className="rounded-lg bg-yellow-400/10 px-3 py-2 text-xs font-medium text-yellow-300 ring-1 ring-yellow-400/30 hover:bg-yellow-400/20"
            >
              ↓ {t.label}
            </a>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Memuat data pajak…</p>}

      {!loading && summary && (
        <>
          {/* Kartu ringkasan */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="PPN Keluaran (B1)" value={summary.ppnOut.ppn} sub={`DPP ${formatCurrencyRp(summary.ppnOut.dpp)}`} />
            <SummaryCard label="PPN Masukan (B2)" value={summary.ppnIn.ppn} sub={`DPP ${formatCurrencyRp(summary.ppnIn.dpp)}`} tone="emerald" />
            <SummaryCard label="PPN Masukan (B3)" value={summary.ppnInNonCreditable.ppn} sub={`DPP ${formatCurrencyRp(summary.ppnInNonCreditable.dpp)}`} tone="slate" />
            <SummaryCard label="PPh 23" value={summary.pph23.ppn} sub={`DPP ${formatCurrencyRp(summary.pph23.dpp)}`} tone="amber" />
            <SummaryCard label="PPh 4(2)" value={summary.pph42.ppn} sub={`DPP ${formatCurrencyRp(summary.pph42.dpp)}`} tone="amber" />
            <SummaryCard label="PPh 21" value={summary.pph21.ppn} sub={`DPP ${formatCurrencyRp(summary.pph21.dpp)}`} tone="amber" />
            <SummaryCard label="PPh 22" value={summary.pph22.ppn} sub={`DPP ${formatCurrencyRp(summary.pph22.dpp)}`} tone="amber" />
            <SummaryCard label="PPh 25" value={summary.pph25.ppn} sub={`DPP ${formatCurrencyRp(summary.pph25.dpp)}`} tone="amber" />
          </div>

          {/* Review baris pajak */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold">Review Baris Pajak</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {summary.lineCount} baris akun pajak untuk {summary.period} — kode diinferensikan otomatis, bisa di-override per baris.
              </p>
            </div>
            {allRows.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">Tidak ada baris akun pajak pada periode ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 font-medium">Tanggal</th>
                      <th className="px-4 py-3 font-medium">Deskripsi</th>
                      <th className="px-4 py-3 font-medium">Akun</th>
                      <th className="px-4 py-3 text-right font-medium">Nilai</th>
                      <th className="px-4 py-3 font-medium">DPP (override)</th>
                      <th className="px-4 py-3 font-medium">Kode Pajak</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRows.map((l) => {
                      const ov = lineOverrides[l.lineId];
                      const current = l.taxCode ?? "";
                      return (
                        <tr key={l.lineId} className="border-b border-slate-800/60 last:border-0 hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 text-xs text-slate-400">
                            {new Date(l.entryDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">{l.journalDescription ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs text-slate-400">{l.accountCode}</span>{" "}
                            <span className="text-xs text-slate-500">{l.accountName}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-200">
                            {formatCurrencyRp(l.credit > 0 ? l.credit : l.debit)}
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="number"
                              value={ov?.taxBase ?? ""}
                              placeholder="auto"
                              onChange={(e) =>
                                setLineOverrides((prev) => ({ ...prev, [l.lineId]: { taxCode: ov?.taxCode ?? "", taxBase: e.target.value } }))
                              }
                              className="w-28 rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-right text-xs text-slate-200 focus:border-yellow-400/60 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={ov?.taxCode ?? ""}
                              onChange={(e) =>
                                setLineOverrides((prev) => ({ ...prev, [l.lineId]: { taxCode: e.target.value, taxBase: ov?.taxBase ?? "" } }))
                              }
                              className="max-w-[220px] rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-yellow-400/60 focus:outline-none"
                            >
                              <option value="">Auto: {current || "—"}</option>
                              {TAX_CODE_OPTIONS.map((o) => (
                                <option key={o.code} value={o.code}>
                                  {o.code} — {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => void saveOverride(l.lineId)}
                              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-yellow-400/50 hover:text-yellow-300"
                            >
                              Simpan
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, tone = "default" }: { label: string; value: number; sub: string; tone?: "default" | "emerald" | "amber" | "slate" }) {
  const valueTone = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : tone === "slate" ? "text-slate-300" : "text-yellow-300";
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueTone}`}>{formatCurrencyRp(value)}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
    </div>
  );
}
