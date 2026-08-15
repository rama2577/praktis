"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrencyRp } from "@/lib/format";

type Asset = {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchaseCost: number;
  residualValue: number;
  method: string;
  commercialLifeMonths: number;
  fiscalGroup: string;
  fiscalGroupLabel: string;
  status: string;
  notes: string | null;
  lastPeriod: string | null;
  accumulatedCommercial: number;
  bookValueCommercial: number;
};

type ScheduleRow = {
  id: string;
  period: string;
  commercialAmount: number;
  fiscalAmount: number;
  accumulatedCommercial: number;
  accumulatedFiscal: number;
  bookValueCommercial: number;
  bookValueFiscal: number;
  journalEntryId: string | null;
};

type Reconciliation = {
  period: string;
  rows: {
    assetId: string;
    name: string;
    category: string;
    purchaseCost: number;
    fiscalGroup: string;
    fiscalGroupLabel: string;
    period: string | null;
    accumulatedCommercial: number;
    accumulatedFiscal: number;
    bookValueCommercial: number;
    bookValueFiscal: number;
    temporaryDifference: number;
  }[];
  totals: { purchaseCost: number; bookValueCommercial: number; bookValueFiscal: number; temporaryDifference: number };
};

const METHOD_LABELS: Record<string, string> = {
  STRAIGHT_LINE: "Garis Lurus",
  DECLINING_BALANCE: "Saldo Menurun",
};

const FISCAL_OPTIONS = [
  { value: "K1", label: "K1 — 4 tahun" },
  { value: "K2", label: "K2 — 8 tahun" },
  { value: "K3", label: "K3 — 16 tahun" },
  { value: "K4", label: "K4 — 20 tahun" },
  { value: "BP", label: "Bangunan Permanen — 20 tahun" },
  { value: "BNP", label: "Bangunan Non-Permanen — 10 tahun" },
];

export function AssetsView({ clients }: { clients: { id: string; name: string }[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Form aset baru
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    purchaseDate: "",
    purchaseCost: "",
    residualValue: "0",
    method: "STRAIGHT_LINE",
    commercialLifeMonths: "48",
    fiscalGroup: "K1",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Jadwal & rekonsiliasi
  const [scheduleAssetId, setScheduleAssetId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleRow[] | null>(null);
  const [depreciatePeriod, setDepreciatePeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reconPeriod, setReconPeriod] = useState(depreciatePeriod);
  const [recon, setRecon] = useState<Reconciliation | null>(null);

  const loadAssets = useCallback(async (cid: string) => {
    if (!cid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${cid}/assets`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal memuat aset");
      setAssets(((await res.json()) as { data: Asset[] }).data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function start() {
      await loadAssets(clientId);
    }
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const loadSchedule = useCallback(async (assetId: string, cid: string) => {
    const res = await fetch(`/api/clients/${cid}/assets/${assetId}`, { cache: "no-store" });
    if (!res.ok) throw new Error((await res.json()).error ?? "Gagal memuat jadwal");
    const detail = ((await res.json()) as { data: { schedules: ScheduleRow[] } }).data;
    setSchedule(detail.schedules);
  }, []);

  const loadRecon = useCallback(async (cid: string, period: string) => {
    if (!period) return;
    const res = await fetch(`/api/clients/${cid}/assets/report?period=${period}`, { cache: "no-store" });
    if (!res.ok) throw new Error((await res.json()).error ?? "Gagal memuat rekonsiliasi");
    setRecon(((await res.json()) as { data: Reconciliation }).data);
  }, []);

  const toggleSchedule = async (assetId: string) => {
    if (scheduleAssetId === assetId) {
      setScheduleAssetId(null);
      setSchedule(null);
      return;
    }
    setScheduleAssetId(assetId);
    setSchedule(null);
    try {
      await loadSchedule(assetId, clientId);
    } catch (e) {
      setFlash(`Gagal: ${(e as Error).message}`);
    }
  };

  const runDepreciation = async () => {
    if (!clientId || !depreciatePeriod) return;
    setFlash(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/assets/depreciate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: depreciatePeriod }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal");
      setFlash(json.message ?? "Penyusutan selesai");
      await loadAssets(clientId);
      if (scheduleAssetId) await loadSchedule(scheduleAssetId, clientId);
      await loadRecon(clientId, reconPeriod);
    } catch (e) {
      setFlash(`Gagal: ${(e as Error).message}`);
    }
  };

  const createAsset = async () => {
    setSaving(true);
    setFlash(null);
    try {
      const body = {
        name: form.name,
        category: form.category,
        purchaseDate: form.purchaseDate,
        purchaseCost: Number(form.purchaseCost),
        residualValue: Number(form.residualValue || 0),
        method: form.method,
        commercialLifeMonths: Number(form.commercialLifeMonths),
        fiscalGroup: form.fiscalGroup,
        notes: form.notes,
      };
      const res = await fetch(`/api/clients/${clientId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data?: { name: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan");
      setFlash(`Aset "${json.data?.name}" didaftarkan.`);
      setShowForm(false);
      setForm({ ...form, name: "", category: "", purchaseCost: "", notes: "" });
      await loadAssets(clientId);
    } catch (e) {
      setFlash(`Gagal: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const monthInput = (value: string, onChange: (v: string) => void) => (
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-yellow-400/60 focus:outline-none"
    />
  );

  return (
    <div className="space-y-6">
      {flash && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-600">
          {flash}
        </div>
      )}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">{error}</div>}

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Klien
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-yellow-400/60 focus:outline-none"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Periode penyusutan
          {monthInput(depreciatePeriod, setDepreciatePeriod)}
        </label>
        <button
          onClick={() => void runDepreciation()}
          className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300"
        >
          Hitung & Catat Penyusutan
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-800 hover:border-yellow-400/50 hover:text-amber-600"
        >
          {showForm ? "Tutup Form" : "+ Daftarkan Aset"}
        </button>
      </div>

      {/* Form aset baru */}
      {showForm && (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input placeholder="Nama aset *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-700 focus:border-yellow-400/60 focus:outline-none" />
          <input placeholder="Kategori * (mis. Kendaraan)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-700 focus:border-yellow-400/60 focus:outline-none" />
          <label className="flex flex-col gap-1 text-xs text-slate-700">
            Tanggal perolehan *
            <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-yellow-400/60 focus:outline-none" />
          </label>
          <input placeholder="Biaya perolehan (Rp) *" type="number" min="0" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-700 focus:border-yellow-400/60 focus:outline-none" />
          <input placeholder="Nilai sisa (Rp)" type="number" min="0" value={form.residualValue} onChange={(e) => setForm({ ...form, residualValue: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-700 focus:border-yellow-400/60 focus:outline-none" />
          <label className="flex flex-col gap-1 text-xs text-slate-700">
            Metode
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-yellow-400/60 focus:outline-none">
              <option value="STRAIGHT_LINE">Garis Lurus</option>
              <option value="DECLINING_BALANCE">Saldo Menurun (2×)</option>
            </select>
          </label>
          <input placeholder="Umur komersial (bulan) *" type="number" min="1" value={form.commercialLifeMonths} onChange={(e) => setForm({ ...form, commercialLifeMonths: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-700 focus:border-yellow-400/60 focus:outline-none" />
          <label className="flex flex-col gap-1 text-xs text-slate-700">
            Kelompok fiskal (Pasal 11)
            <select value={form.fiscalGroup} onChange={(e) => setForm({ ...form, fiscalGroup: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-yellow-400/60 focus:outline-none">
              {FISCAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <input placeholder="Catatan (opsional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-700 focus:border-yellow-400/60 focus:outline-none sm:col-span-2 lg:col-span-4" />
          <div className="flex justify-end sm:col-span-2 lg:col-span-4">
            <button onClick={() => void createAsset()} disabled={saving || !form.name || !form.category || !form.purchaseDate || !form.purchaseCost || !form.commercialLifeMonths} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? "Menyimpan…" : "Simpan Aset"}
            </button>
          </div>
        </div>
      )}

      {/* Register */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Register Aset Tetap</h2>
          <p className="mt-0.5 text-xs text-slate-700">Penyusutan komersial (PSAK 216) & fiskal (Pasal 11) dihitung otomatis per periode.</p>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-slate-700">Memuat aset…</p>
        ) : assets.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-700">Belum ada aset terdaftar untuk klien ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-700">
                  <th className="px-4 py-3 font-medium">Aset</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Perolehan</th>
                  <th className="px-4 py-3 text-right font-medium">Biaya</th>
                  <th className="px-4 py-3 font-medium">Metode / Umur</th>
                  <th className="px-4 py-3 font-medium">Fiskal</th>
                  <th className="px-4 py-3 text-right font-medium">Nilai Buku</th>
                  <th className="px-4 py-3 font-medium">Jadwal</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <AssetRow
                    key={a.id}
                    asset={a}
                    open={scheduleAssetId === a.id}
                    schedule={schedule}
                    onToggle={() => void toggleSchedule(a.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rekonsiliasi fiskal */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Rekonsiliasi Fiskal Aset</h2>
            <p className="mt-0.5 text-xs text-slate-700">Beda temporer nilai buku komersial vs fiskal (dasar pajak tangguhan).</p>
          </div>
          <div className="flex items-center gap-2">
            {monthInput(reconPeriod, setReconPeriod)}
            <button onClick={() => void loadRecon(clientId, reconPeriod)} className="rounded border border-slate-300 px-3 py-2 text-xs text-slate-800 hover:border-yellow-400/50 hover:text-amber-600">
              Muat
            </button>
            <a
              href={`/api/clients/${clientId}/assets/report?period=${reconPeriod}&format=csv`}
              className="rounded border border-slate-300 px-3 py-2 text-xs text-slate-800 hover:border-yellow-400/50 hover:text-amber-600"
            >
              ↓ CSV
            </a>
          </div>
        </div>
        {recon ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-700">
                  <th className="px-4 py-3 font-medium">Aset</th>
                  <th className="px-4 py-3 font-medium">Fiskal</th>
                  <th className="px-4 py-3 text-right font-medium">Biaya</th>
                  <th className="px-4 py-3 text-right font-medium">Nilai Buku Komersial</th>
                  <th className="px-4 py-3 text-right font-medium">Nilai Buku Fiskal</th>
                  <th className="px-4 py-3 text-right font-medium">Beda Temporer</th>
                </tr>
              </thead>
              <tbody>
                {recon.rows.map((r) => (
                  <tr key={r.assetId} className="border-b border-slate-200/60 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{r.fiscalGroupLabel}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatCurrencyRp(r.purchaseCost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">{formatCurrencyRp(r.bookValueCommercial)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">{formatCurrencyRp(r.bookValueFiscal)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${r.temporaryDifference === 0 ? "text-slate-700" : "text-amber-600"}`}>
                      {formatCurrencyRp(r.temporaryDifference)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50/40 font-medium">
                  <td className="px-4 py-3 text-slate-900" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">{formatCurrencyRp(recon.totals.bookValueCommercial)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">{formatCurrencyRp(recon.totals.bookValueFiscal)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${recon.totals.temporaryDifference === 0 ? "text-slate-700" : "text-amber-600"}`}>
                    {formatCurrencyRp(recon.totals.temporaryDifference)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-slate-700">Pilih periode lalu klik &quot;Muat&quot; untuk melihat rekonsiliasi.</p>
        )}
      </div>
    </div>
  );
}

function AssetRow({
  asset,
  open,
  schedule,
  onToggle,
}: {
  asset: Asset;
  open: boolean;
  schedule: ScheduleRow[] | null;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-200/60 hover:bg-white/[0.02]">
        <td className="px-4 py-3 font-medium text-slate-800">{asset.name}</td>
        <td className="px-4 py-3 text-slate-700">{asset.category}</td>
        <td className="px-4 py-3 text-slate-700">
          {new Date(asset.purchaseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatCurrencyRp(asset.purchaseCost)}</td>
        <td className="px-4 py-3 text-slate-700">
          {METHOD_LABELS[asset.method] ?? asset.method} · {asset.commercialLifeMonths} bln
        </td>
        <td className="px-4 py-3 text-xs text-slate-700">{asset.fiscalGroupLabel}</td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-800">{formatCurrencyRp(asset.bookValueCommercial)}</td>
        <td className="px-4 py-3">
          <button onClick={onToggle} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-yellow-400/50 hover:text-amber-600">
            {open ? "Tutup" : "Jadwal"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/40">
          <td colSpan={8} className="px-4 py-3">
            {schedule === null ? (
              <p className="text-sm text-slate-700">Memuat jadwal…</p>
            ) : schedule.length === 0 ? (
              <p className="text-sm text-slate-700">
                Belum ada jadwal. Jalankan &quot;Hitung &amp; Catat Penyusutan&quot; untuk periode pertama.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700">
                      <th className="py-2 pr-3 font-medium">Periode</th>
                      <th className="py-2 pr-3 text-right font-medium">Komersial</th>
                      <th className="py-2 pr-3 text-right font-medium">Fiskal</th>
                      <th className="py-2 pr-3 text-right font-medium">Akum. Komersial</th>
                      <th className="py-2 pr-3 text-right font-medium">Akum. Fiskal</th>
                      <th className="py-2 pr-3 text-right font-medium">Nilai Buku Kom.</th>
                      <th className="py-2 pr-3 text-right font-medium">Nilai Buku Fiskal</th>
                      <th className="py-2 font-medium">Jurnal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((s) => (
                      <tr key={s.id} className="border-b border-slate-200/60 last:border-0">
                        <td className="py-2 pr-3 font-mono text-slate-700">{s.period}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-emerald-600">{formatCurrencyRp(s.commercialAmount)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{formatCurrencyRp(s.fiscalAmount)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{formatCurrencyRp(s.accumulatedCommercial)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{formatCurrencyRp(s.accumulatedFiscal)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-800">{formatCurrencyRp(s.bookValueCommercial)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-800">{formatCurrencyRp(s.bookValueFiscal)}</td>
                        <td className="py-2">
                          {s.journalEntryId ? (
                            <a href={`/dashboard/reports/ledger`} className="text-amber-600/90 hover:underline">
                              ✓ tercatat
                            </a>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function BulkUploadAssets({ clientId, onUploaded }: { clientId: string; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/clients/${clientId}/assets/upload`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({ error: "Gagal" }));
      if (!res.ok) throw new Error(data.error ?? "Gagal");
      setMsg(data.message ?? `✅ ${data.data?.created ?? 0} aset berhasil diupload`);
      onUploaded();
    } catch (err) {
      setMsg(`❌ ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${uploading ? "opacity-50" : "border-slate-200 text-slate-700 hover:border-yellow-400/50"}`}>
      {uploading ? "Mengupload..." : "⬇ Upload Spreadsheet"}
      <input type="file" accept=".csv,.txt,.tsv" onChange={handleUpload} className="hidden" disabled={uploading} />
      {msg && <span className={`ml-2 text-xs ${msg.startsWith("✅") ? "text-emerald-600" : "text-rose-600"}`}>{msg}</span>}
    </label>
  );
}
