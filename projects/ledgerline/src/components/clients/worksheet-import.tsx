/**
 * Import Kertas Kerja Excel (wizard 3 langkah):
 * 1) Upload file → 2) Preview (COA, jurnal, peringatan) → 3) Konfirmasi import.
 * Sumber pola: kertas kerja akuntan senior (sheet Akun + Jurnal).
 */

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Preview = {
  clientName: string;
  year: number | null;
  coa: { code: string; name: string; posSaldo: string; posLaporan: string; openingDebit: number; openingCredit: number }[];
  journals: { date: string; bukti: string; keterangan: string; balanced: boolean; totalDebit: number; totalCredit: number }[];
  subledgerCodes: { code: string; name: string; group: string }[];
  warnings: string[];
  stats: {
    coaCount: number;
    journalGroups: number;
    journalLines: number;
    totalDebit: number;
    totalCredit: number;
    unbalancedGroups: number;
    unknownAccountLines: number;
    openingBalanceAccounts: number;
  };
};

const fmt = (n: number) => n.toLocaleString("id-ID");

export function WorksheetImportWizard({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [industry, setIndustry] = useState<string>("SERVICES");
  const [result, setResult] = useState<{ clientId: string; clientName: string; journalCreated: number; coaImported: number } | null>(null);

  async function uploadPreview() {
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/clients/import/worksheet?mode=preview", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memproses file");
      setPreview(json.result);
      setClientName(json.result.clientName ?? "");
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    if (!file || !preview) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "commit");
    fd.append("clientName", clientName);
    fd.append("industry", industry);
    try {
      const res = await fetch("/api/clients/import/worksheet?mode=commit", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan");
      setResult(json);
      setStep(3);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const back = () => {
    setError(null);
    if (step === 2) setStep(1);
    else setStep(2);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-slate-900">📥 Import Kertas Kerja Excel</h3>
          <p className="mt-0.5 text-xs text-slate-700">
            Langkah {step} dari 3 — {step === 1 ? "unggah file" : step === 2 ? "tinjau hasil parse" : "selesai"}
          </p>
        </div>
        <button onClick={onDone} className="text-xs text-slate-700 hover:text-slate-700">✕ Tutup</button>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-yellow-400/50"
            >
              {file ? `📎 ${file.name}` : "Pilih file .xlsx"}
            </button>
            <p className="mt-2 text-[11px] text-slate-700">
              Format kertas kerja akuntan: sheet <b>Akun</b> (COA + saldo awal) & <b>Jurnal</b> (jurnal umum). Auto-detect kolom.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onDone} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-500">Batal</button>
            <button
              onClick={uploadPreview}
              disabled={!file || loading}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[#ffffff] transition hover:bg-yellow-300 disabled:opacity-40"
            >
              {loading ? "Memproses…" : "Tinjau →"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-4">
          {/* Ringkasan */}
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            {[
              { label: "Klien", value: preview.clientName || "—" },
              { label: "Akun COA", value: String(preview.stats.coaCount) },
              { label: "Baris Jurnal", value: fmt(preview.stats.journalLines) },
              { label: "Grup Jurnal", value: String(preview.stats.journalGroups) },
              { label: "Total Debet", value: fmt(preview.stats.totalDebit) },
              { label: "Total Kredit", value: fmt(preview.stats.totalCredit) },
              { label: "Akun Saldo Awal", value: String(preview.stats.openingBalanceAccounts) },
              { label: "Kode Bantu", value: String(preview.subledgerCodes.length) },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-slate-200 bg-white p-2.5">
                <p className="text-[10px] text-slate-700">{c.label}</p>
                <p className="mt-0.5 truncate font-mono text-sm text-slate-800">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Peringatan */}
          {preview.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="mb-1 text-xs font-semibold text-amber-600">⚠ {preview.warnings.length} peringatan</p>
              <ul className="list-inside list-disc space-y-0.5 text-[11px] text-amber-200/80">
                {preview.warnings.slice(0, 8).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {preview.warnings.length > 8 && <li>…dan {preview.warnings.length - 8} lainnya (detail di laporan import)</li>}
              </ul>
            </div>
          )}

          {/* COA pratinjau */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-700">COA (contoh {Math.min(6, preview.coa.length)} dari {preview.coa.length})</p>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-2 py-1.5">Kode</th>
                    <th className="px-2 py-1.5">Nama Akun</th>
                    <th className="px-2 py-1.5">Pos</th>
                    <th className="px-2 py-1.5 text-right">Saldo Awal D</th>
                    <th className="px-2 py-1.5 text-right">Saldo Awal K</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.coa.slice(0, 6).map((c) => (
                    <tr key={c.code} className="border-t border-slate-200/60 text-slate-700">
                      <td className="px-2 py-1 font-mono">{c.code}</td>
                      <td className="px-2 py-1">{c.name}</td>
                      <td className="px-2 py-1">{c.posLaporan || c.posSaldo}</td>
                      <td className="px-2 py-1 text-right font-mono">{c.openingDebit ? fmt(c.openingDebit) : ""}</td>
                      <td className="px-2 py-1 text-right font-mono">{c.openingCredit ? fmt(c.openingCredit) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Konfigurasi import */}
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-3">
            <label className="text-xs">
              <span className="text-slate-700">Nama Klien</span>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-800"
              />
            </label>
            <label className="text-xs">
              <span className="text-slate-700">Industri</span>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as typeof industry)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-800"
              >
                {[
                  ["SERVICES", "Jasa"], ["RETAIL", "Perdagangan"], ["FNB", "F&B"], ["MANUFACTURING", "Manufaktur"],
                  ["CONSTRUCTION", "Konstruksi"], ["PROPERTY", "Properti"], ["HOSPITALITY", "Hotel"], ["HEALTHCARE", "Kesehatan"],
                  ["EDUCATION", "Pendidikan"], ["COOPERATIVE", "Koperasi"], ["NONPROFIT", "Yayasan"], ["AGRICULTURE", "Agrikultur"],
                  ["TRANSPORT", "Transportasi"], ["TECHNOLOGY", "Teknologi"], ["FINANCE", "Fintech"], ["EVENT", "Event"], ["OTHER", "Lainnya"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end text-[11px] text-slate-700">
              Jurnal historis masuk sebagai <b className="mx-1 text-slate-700">APPROVED/MANUAL</b> + jurnal opening balance (saldo awal).
            </div>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-between">
            <button onClick={back} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-500">← Kembali</button>
            <button
              onClick={commit}
              disabled={loading || !clientName.trim()}
              className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-[#ffffff] transition hover:bg-yellow-300 disabled:opacity-40"
            >
              {loading ? "Mengimpor…" : `Import ${preview.stats.coaCount} akun + ${preview.stats.journalGroups} jurnal`}
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-3 text-center">
          <p className="text-3xl">🎉</p>
          <h4 className="font-heading text-lg font-semibold text-slate-900">Import selesai</h4>
          <p className="text-sm text-slate-700">
            <b className="text-slate-800">{result.clientName}</b> dibuat — {result.coaImported} akun COA,{" "}
            {fmt(result.journalCreated)} jurnal (termasuk opening balance).
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={onDone}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-500"
            >
              Tutup
            </button>
            <button
              onClick={() => router.push(`/dashboard/clients/${result.clientId}`)}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[#ffffff] transition hover:bg-yellow-300"
            >
              Buka klien →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
