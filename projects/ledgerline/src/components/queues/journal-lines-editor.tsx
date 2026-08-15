"use client";

import { useMemo, useState } from "react";
import { formatCurrencyRp } from "@/lib/format";

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
  initialLines: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    debit: string;
    credit: string;
    psakRef: string;
    notes?: string | null;
  }>;
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

export function JournalLinesEditor({ taskId, initialLines, onSaved, onCancel }: Props) {
  const [rows, setRows] = useState<EditableLine[]>(() => toEditable(initialLines));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              balance.ok
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-amber-500/15 text-accent"
            }`}
            role="status"
          >
            {balance.ok ? "✓ Seimbang" : balance.issue ?? "Belum seimbang"}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-700">
            <tr>
              <th scope="col" className="w-8 px-2 py-2"></th>
              <th scope="col" className="px-2 py-2">Kode</th>
              <th scope="col" className="px-2 py-2">Akun</th>
              <th scope="col" className="w-32 px-2 py-2 text-right">Debit</th>
              <th scope="col" className="w-32 px-2 py-2 text-right">Kredit</th>
              <th scope="col" className="px-2 py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
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
                  <input
                    value={r.accountCode}
                    onChange={(e) => updateRow(r.key, { accountCode: e.target.value })}
                    placeholder="1-1100"
                    className="w-24 rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-800 placeholder:text-slate-700 focus:border-accent/50 focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.accountName}
                    onChange={(e) => updateRow(r.key, { accountName: e.target.value })}
                    placeholder="Kas dan Setara Kas"
                    className="w-full min-w-40 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 placeholder:text-slate-700 focus:border-accent/50 focus:outline-none"
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
              <td colSpan={3} className="px-2 py-2 text-slate-700">Total</td>
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
          className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
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
