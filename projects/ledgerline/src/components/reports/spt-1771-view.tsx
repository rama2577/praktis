/**
 * Gap #4 — SPT 1771: Lampiran I rekonsiliasi fiskal (kolom koreksi editable),
 * Lampiran II penyusutan, Lampiran III perhitungan PPh, export CSV.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCurrencyRp } from "@/lib/format";
import { SelectClient, PeriodInput } from "./analytics-views";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type Client = { id: string; name: string };

type RekRow = { kode: string; nama: string; komersial: number; koreksiPositif: number; koreksiNegatif: number; fiskal: number };
type PenyRow = { assetCode: string; assetName: string; kelompok: string; komersial: number; fiskal: number; koreksi: number };

type SptData = {
  clientName: string;
  year: number;
  pendapatan: RekRow[];
  beban: RekRow[];
  labaKomersial: number;
  totalKoreksiPositif: number;
  totalKoreksiNegatif: number;
  labaFiskal: number;
  peredaranBruto: number;
  penyusutan: PenyRow[];
  koreksiPenyusutan: number;
  mode: "31e" | "pp23" | "normal";
  tarifPph: number;
  pkp: number;
  pphTerutang: number;
  kreditPajak: number;
  pphKurangBayar: number;
  catatan: string[];
};

type Mode = "31e" | "pp23" | "normal";

const MODE_LABELS: Record<Mode, string> = {
  "31e": "Pasal 31E (peredaran ≤ Rp50 M)",
  pp23: "PP 23/2018 final 0,5% (≤ Rp4,8 M)",
  normal: "Tarif normal Pasal 17",
};

export function Spt1771View({
  clients, period, clientId, setClientId, setPeriod,
}: {
  clients: Client[];
  period: string;
  clientId: string;
  setClientId: (v: string) => void;
  setPeriod: (v: string) => void;
}) {
  const [data, setData] = useState<SptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("31e");
  const [rows, setRows] = useState<(RekRow & { isBeban: boolean })[]>([]);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const year = parseInt(period.slice(0, 4), 10);
      const res = await fetch(`/api/clients/${clientId}/spt-1771?year=${year}&mode=${mode}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat SPT 1771");
      const d = json.data as SptData;
      setData(d);
      setRows([
        ...d.pendapatan.map((r) => ({ ...r, isBeban: false })),
        ...d.beban.map((r) => ({ ...r, isBeban: true })),
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId, period, mode]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => {
    const labaKom = rows.reduce((s, r) => s + (r.isBeban ? -r.komersial : r.komersial), 0);
    const korPos = rows.reduce((s, r) => s + r.koreksiPositif, 0);
    const korNeg = rows.reduce((s, r) => s + r.koreksiNegatif, 0);
    return { labaKom, korPos, korNeg, fiskal: labaKom + korPos - korNeg };
  }, [rows]);

  const updateRow = (idx: number, field: "koreksiPositif" | "koreksiNegatif", value: number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value, fiskal: r.komersial + (field === "koreksiPositif" ? value : r.koreksiPositif) - (field === "koreksiNegatif" ? value : r.koreksiNegatif) } : r)));
  };

  const download = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRekonsiliasi = () => {
    if (!data) return;
    const L = [`LAMPIRAN I — REKONSILIASI FISKAL, ${data.clientName}, Tahun ${data.year}`];
    L.push("Kode;Nama Akun;Komersial (Rp);Koreksi Positif (Rp);Koreksi Negatif (Rp);Fiskal (Rp)");
    for (const r of rows) L.push([r.kode, r.nama, r.komersial, r.koreksiPositif, r.koreksiNegatif, r.fiskal].join(";"));
    L.push(`TOTAL;Laba Komersial;${totals.labaKom};;;;`);
    L.push(`TOTAL;Koreksi Positif;;${totals.korPos};;;`);
    L.push(`TOTAL;Koreksi Negatif;;;${totals.korNeg};;`);
    L.push(`TOTAL;Laba Fiskal;;;;;${totals.fiskal}`);
    download(`SPT1771-LampiranI-${data.clientName.replace(/\s+/g, "-")}-${data.year}.csv`, "\uFEFF" + L.join("\n"));
  };

  const exportPenyusutan = () => {
    if (!data) return;
    const L = [`LAMPIRAN II — PENYUSUTAN & AMORTISASI, ${data.clientName}, Tahun ${data.year}`];
    L.push("Kode Aset;Nama Aset;Kelompok;Komersial (Rp);Fiskal (Rp);Koreksi (Rp)");
    for (const r of data.penyusutan) L.push([r.assetCode, r.assetName, r.kelompok, r.komersial, r.fiskal, r.koreksi].join(";"));
    if (data.penyusutan.length === 0) L.push("(tidak ada jadwal penyusutan pada tahun berjalan)");
    download(`SPT1771-LampiranII-${data.clientName.replace(/\s+/g, "-")}-${data.year}.csv`, "\uFEFF" + L.join("\n"));
  };

  const exportPph = () => {
    if (!data) return;
    const L = [`LAMPIRAN III — PERHITUNGAN PPh, ${data.clientName}, Tahun ${data.year}`];
    L.push("Pos;Nilai (Rp)");
    L.push(`Peredaran Bruto;${data.peredaranBruto}`);
    L.push(`Laba Fiskal;${totals.fiskal}`);
    L.push(`Penghasilan Kena Pajak (PKP);${Math.max(0, totals.fiskal)}`);
    L.push(`Mode;${data.mode.toUpperCase()}`);
    L.push(`Tarif;${data.tarifPph * 100}%`);
    L.push(`PPh Terutang;${data.pphTerutang}`);
    L.push(`Kredit Pajak (PPh dibayar dimuka);${data.kreditPajak}`);
    L.push(`PPh Kurang/(Lebih) Bayar;${data.pphKurangBayar}`);
    for (const c of data.catatan) L.push(`Catatan;${c}`);
    download(`SPT1771-LampiranIII-${data.clientName.replace(/\s+/g, "-")}-${data.year}.csv`, "\uFEFF" + L.join("\n"));
  };

  if (!clientId) return <EmptyState title="Pilih klien" description="Pilih klien untuk menyusun SPT 1771." />;

  const fmt = (n: number) => (n === 0 ? "—" : formatCurrencyRp(n));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <SelectClient clients={clients} clientId={clientId} setClientId={setClientId} />
        <PeriodInput period={period} setPeriod={setPeriod} />
        <div>
          <label className="mb-1 block text-xs text-slate-700">Mode perhitungan PPh</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          >
            {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
              <option key={m} value={m}>{MODE_LABELS[m]}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && <p className="p-4 text-sm text-slate-700">Menyusun SPT 1771…</p>}

      {!loading && data && (
        <div className="space-y-5">
          {/* ── Lampiran I ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-medium text-slate-900">🧾 Lampiran I — Rekonsiliasi Fiskal ({data.year})</h3>
                <p className="text-xs text-slate-700">Koreksi otomatis dari heuristik; angka koreksi bisa diedit langsung.</p>
              </div>
              <button onClick={exportRekonsiliasi} className="rounded-lg border border-yellow-400/40 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-yellow-400/10">
                ⬇ Export CSV Lampiran I
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Kode</th>
                    <th className="px-3 py-2 text-left font-medium">Nama Akun</th>
                    <th className="px-2 py-2 font-medium">Komersial (Rp)</th>
                    <th className="px-2 py-2 font-medium">Koreksi + (Rp)</th>
                    <th className="px-2 py-2 font-medium">Koreksi − (Rp)</th>
                    <th className="px-3 py-2 font-medium">Fiskal (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.kode}-${i}`} className={`border-t border-slate-200/60 ${r.isBeban ? "text-slate-700" : "text-slate-800"}`}>
                      <td className="px-3 py-1.5 font-mono text-slate-700">{r.kode}</td>
                      <td className="px-3 py-1.5 text-left">{r.nama}</td>
                      <td className="px-2 py-1.5 font-mono">{fmt(r.komersial)}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={r.koreksiPositif}
                          onChange={(e) => updateRow(i, "koreksiPositif", Number(e.target.value) || 0)}
                          className="w-28 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-right font-mono text-rose-200"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={r.koreksiNegatif}
                          onChange={(e) => updateRow(i, "koreksiNegatif", Number(e.target.value) || 0)}
                          className="w-28 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-right font-mono text-emerald-200"
                        />
                      </td>
                      <td className="px-3 py-1.5 font-mono font-medium text-slate-900">{fmt(r.fiskal)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 bg-slate-50/80 font-semibold text-slate-900">
                    <td className="px-3 py-2 text-left" colSpan={2}>Laba (Rugi) Komersial</td>
                    <td className="px-2 py-2 font-mono">{fmt(totals.labaKom)}</td>
                    <td className="px-2 py-2" /><td className="px-2 py-2" /><td className="px-3 py-2" />
                  </tr>
                  <tr className="border-t border-slate-200 font-semibold text-slate-900">
                    <td className="px-3 py-2 text-left" colSpan={2}>Koreksi Fiskal Positif</td>
                    <td className="px-2 py-2" /><td className="px-2 py-2 font-mono text-rose-600">{fmt(totals.korPos)}</td><td className="px-2 py-2" /><td className="px-3 py-2" />
                  </tr>
                  <tr className="border-t border-slate-200 font-semibold text-slate-900">
                    <td className="px-3 py-2 text-left" colSpan={2}>Koreksi Fiskal Negatif</td>
                    <td className="px-2 py-2" /><td className="px-2 py-2" /><td className="px-2 py-2 font-mono text-emerald-600">{fmt(totals.korNeg)}</td><td className="px-3 py-2" />
                  </tr>
                  <tr className="border-t border-yellow-400/30 bg-yellow-400/5 font-bold text-yellow-200">
                    <td className="px-3 py-2 text-left" colSpan={2}>Laba Fiskal (Penghasilan Kena Pajak)</td>
                    <td className="px-2 py-2" /><td className="px-2 py-2" /><td className="px-2 py-2" />
                    <td className="px-3 py-2 font-mono">{fmt(totals.fiskal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Lampiran II ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-medium text-slate-900">🏗️ Lampiran II — Penyusutan & Amortisasi Fiskal</h3>
              <button onClick={exportPenyusutan} className="rounded-lg border border-yellow-400/40 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-yellow-400/10">
                ⬇ Export CSV Lampiran II
              </button>
            </div>
            {data.penyusutan.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-700">Tidak ada jadwal penyusutan pada tahun berjalan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Kode</th>
                      <th className="px-3 py-2 text-left font-medium">Aset</th>
                      <th className="px-2 py-2 font-medium">Kelompok</th>
                      <th className="px-2 py-2 font-medium">Komersial (Rp)</th>
                      <th className="px-2 py-2 font-medium">Fiskal (Rp)</th>
                      <th className="px-3 py-2 font-medium">Koreksi (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.penyusutan.map((r) => (
                      <tr key={r.assetCode} className="border-t border-slate-200/60 text-slate-700">
                        <td className="px-3 py-1.5 font-mono text-slate-700">{r.assetCode}</td>
                        <td className="px-3 py-1.5 text-left">{r.assetName}</td>
                        <td className="px-2 py-1.5">{r.kelompok}</td>
                        <td className="px-2 py-1.5 font-mono">{fmt(r.komersial)}</td>
                        <td className="px-2 py-1.5 font-mono">{fmt(r.fiskal)}</td>
                        <td className={`px-3 py-1.5 font-mono ${r.koreksi !== 0 ? "text-rose-600" : "text-slate-700"}`}>{fmt(r.koreksi)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Lampiran III ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-medium text-slate-900">💰 Lampiran III — Perhitungan PPh Terutang</h3>
              <button onClick={exportPph} className="rounded-lg border border-yellow-400/40 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-yellow-400/10">
                ⬇ Export CSV Lampiran III
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["Peredaran Bruto", data.peredaranBruto],
                ["Laba Fiskal (PKP)", Math.max(0, totals.fiskal)],
                ["Tarif Efektif", `${data.tarifPph * 100}%` as unknown as number],
                ["PPh Terutang", data.pphTerutang],
                ["Kredit Pajak (Dibayar Dimuka)", data.kreditPajak],
                ["PPh Kurang/(Lebih) Bayar", data.pphKurangBayar],
              ] as [string, number][]).map(([label, v]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                  <p className="text-[11px] text-slate-700">{label}</p>
                  <p className={`font-mono text-base font-semibold ${label.includes("Kurang") && data.pphKurangBayar > 0 ? "text-rose-600" : "text-slate-900"}`}>
                    {typeof v === "number" ? fmt(v) : v}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-4 pb-3">
              {data.catatan.map((c, i) => (
                <p key={i} className="text-[11px] text-slate-700">• {c}</p>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-700">
            💡 Merujuk KB <em>mapping-laporan-spt-1771</em>: Lampiran IV (kompensasi kerugian) & V (struktur permodalan) menyusul.
            Tarif: UU HPP No. 7/2021 — 22% (2020–2022), 20% (2023+). Fasilitas Pasal 31E & PP 23/2018 tersedia di dropdown.
          </p>
        </div>
      )}
    </div>
  );
}
