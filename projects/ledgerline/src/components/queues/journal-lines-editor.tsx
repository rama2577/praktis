"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrencyRp } from "@/lib/format";
import { CoaSelect, type CoaAccount } from "@/components/queues/coa-select";

export type EditableLine = {
  key: string; // key client-side (baris baru pakai crypto.randomUUID / counter)
  id?: string; // id baris di DB — ada untuk baris lama
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  notes: string;
};

type Props = {
  taskId: string;
  clientId: string;
  initialLines: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    debit: string;
    credit: string;
    psakRef: string;
    notes?: string | null;
  }>;
  initialDescription: string;
  onSaved: (message: string) => void;
  onCancel: () => void;
};

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `new-${keyCounter}`;
}

function toEditable(lines: Props["initialLines"]): EditableLine[] {
  return lines.map((l) => ({
    key: l.id,
    id: l.id,
    accountCode: l.accountCode,
    accountName: l.accountName,
    debit: l.debit === "0" ? "" : String(Number(l.debit)),
    credit: l.credit === "0" ? "" : String(Number(l.credit)),
    notes: l.notes ?? "",
  }));
}

function parseAmount(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function JournalLinesEditor({ taskId, clientId, initialLines, initialDescription, onSaved, onCancel }: Props) {
  const [rows, setRows] = useState<EditableLine[]>(() => toEditable(initialLines));
  const [description, setDescription] = useState(initialDescription);
  const [descSource, setDescSource] = useState<string | null>(null);
  const [coa, setCoa] = useState<CoaAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [descBusy, setDescBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ambil COA klien untuk dropdown akun (search abjad nama).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/coa`);
        if (!res.ok) return;
        const body = (await res.json()) as { data?: { accounts?: CoaAccount[] } };
        if (!cancelled && body.data?.accounts) setCoa(body.data.accounts);
      } catch {
        /* COA opsional — fallback ke input bebas */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const balance = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let issue: string | null = null;
    for (const r of rows) {
      const d = parseAmount(r.debit);
      const c = parseAmount(r.credit);
      if (Number.isNaN(d) || Number.isNaN(c)) {
        issue = "Nilai harus berupa angka.";
        break;
      }
      if (d < 0 || c < 0) {
        issue = "Nilai tidak boleh negatif.";
        break;
      }
      if (d > 0 && c > 0) {
        issue = "Debit dan kredit tidak boleh terisi bersamaan.";
        break;
      }
      if (d === 0 && c === 0) {
        issue = "Debit atau kredit wajib diisi.";
        break;
      }
      totalDebit += d;
      totalCredit += c;
    }
    if (!issue && rows.length < 2) issue = "Minimal 2 baris jurnal.";
    if (!issue && Math.abs(totalDebit - totalCredit) > 0.005) {
      issue = "Total debit harus sama dengan total kredit.";
    }
    return { totalDebit, totalCredit, ok: issue === null, issue };
  }, [rows]);

  const updateRow = (key: string, patch: Partial<EditableLine>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { key: nextKey(), accountCode: "", accountName: "", debit: "", credit: "", notes: "" }]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const generateDescription = async () => {
    setDescBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/journals/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: rows.map((r) => ({
            accountName: r.accountName,
            debit: r.debit === "" ? 0 : Number(r.debit),
            credit: r.credit === "" ? 0 : Number(r.credit),
            notes: r.notes || null,
          })),
        }),
      });
      const body = (await res.json()) as { data?: { description?: string; source?: string }; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Gagal membuat deskripsi");
      if (body.data?.description) {
        setDescription(body.data.description);
        setDescSource(body.data.source ?? "AI");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDescBusy(false);
    }
  };

  const save = async () => {
    setError(null);
    if (!balance.ok) {
      setError(balance.issue ?? "Jurnal belum seimbang.");
      return;
    }
    for (const r of rows) {
      if (!r.accountCode.trim() || !r.accountName.trim()) {
        setError("Kode dan nama akun wajib diisi di setiap baris.");
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${taskId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          lines: rows.map((r) => ({
            id: r.id,
            accountCode: r.accountCode.trim(),
            accountName: r.accountName.trim(),
            debit: r.debit === "" ? 0 : Number(r.debit),
            credit: r.credit === "" ? 0 : Number(r.credit),
            notes: r.notes.trim() || undefined,
          })),
        }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Simpan koreksi gagal");
      onSaved(json.message ?? "Jurnal diperbarui.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-700">
          ✏️ Edit baris jurnal — simpan <span className="text-slate-800">tidak mengubah stage</span> review, koreksi
          tercatat sebagai feedback KB.
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            balance.ok ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-accent"
          }`}
          role="status"
        >
          {balance.ok ? "✓ Seimbang" : balance.issue ?? "Belum seimbang"}
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-700">Deskripsi transaksi</span>
          <div className="flex items-center gap-2">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="mis. Penjualan tunai — PT Maju Jaya"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void generateDescription()}
              disabled={descBusy}
              title="Buat deskripsi otomatis dengan AI dari baris jurnal"
              className="shrink-0 rounded-lg border border-ai/40 bg-ai/10 px-3 py-2 text-sm font-medium text-ai transition hover:bg-ai/20 disabled:opacity-50"
            >
              {descBusy ? "…" : "✨ AI"}
            </button>
          </div>
          {descSource && (
            <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium bg-ai/10 text-ai">
              {descSource === "AI" ? "saran AI — periksa sebelum simpan" : "deskripsi aturan — periksa sebelum simpan"}
            </span>
          )}
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-700">
            <tr>
              <th scope="col" className="w-8 px-2 py-2"></th>
              <th scope="col" className="px-2 py-2">Akun (COA klien)</th>
              <th scope="col" className="w-32 px-2 py-2 text-right">Debit</th>
              <th scope="col" className="w-32 px-2 py-2 text-right">Kredit</th>
              <th scope="col" className="px-2 py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    aria-label={`Hapus baris ${r.accountCode || "baru"}`}
                    disabled={rows.length <= 2}
                    onClick={() => removeRow(r.key)}
                    className="rounded border border-slate-200 px-1.5 text-xs text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ✕
                  </button>
                </td>
                <td className="px-2 py-1.5">
                  <CoaSelect
                    accounts={coa}
                    code={r.accountCode}
                    name={r.accountName}
                    onChange={(accountCode, accountName) => updateRow(r.key, { accountCode, accountName })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.debit}
                    onChange={(e) => updateRow(r.key, { debit: e.target.value })}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-right font-mono text-xs text-slate-800 placeholder:text-slate-700 focus:border-accent/50 focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.credit}
                    onChange={(e) => updateRow(r.key, { credit: e.target.value })}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-right font-mono text-xs text-slate-800 placeholder:text-slate-700 focus:border-accent/50 focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.notes}
                    onChange={(e) => updateRow(r.key, { notes: e.target.value })}
                    placeholder="Catatan baris (opsional)"
                    className="w-full min-w-36 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 placeholder:text-slate-700 focus:border-accent/50 focus:outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 text-xs">
            <tr>
              <td colSpan={2} className="px-2 py-2 text-slate-700">Total</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-800">{formatCurrencyRp(balance.totalDebit)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-800">{formatCurrencyRp(balance.totalCredit)}</td>
              <td className="px-2 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1f49ce] disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "Simpan Koreksi"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={addRow}
          className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-200 disabled:opacity-50"
        >
          + Tambah baris
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
