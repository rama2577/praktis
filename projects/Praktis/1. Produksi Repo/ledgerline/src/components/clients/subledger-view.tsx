/**
 * Buku Besar Pembantu (Subledger) — Gap #1.
 * Tab dalam halaman klien: aging piutang, master pelanggan/pemasok, buku besar
 * pembantu per subledger (running balance).
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrencyRp } from "@/lib/format";
import { ErrorState } from "@/components/ui/error-state";

type SubledgerRow = {
  id: string;
  code: string;
  name: string;
  type: "CUSTOMER" | "VENDOR" | "SHAREHOLDER" | "OTHER";
  status: "ACTIVE" | "INACTIVE";
  openingBalance: number;
  debit: number;
  credit: number;
  balance: number;
  lastActivity: string | null;
};

type AgingRow = {
  code: string;
  name: string;
  total: number;
  buckets: { bucket: string; label: string; amount: number }[];
};

type LedgerRow = {
  date: string;
  bukti: string | null;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
};

const TYPE_LABEL: Record<string, string> = {
  CUSTOMER: "Pelanggan",
  VENDOR: "Pemasok",
  SHAREHOLDER: "Pemegang Saham",
  OTHER: "Lainnya",
};

const TYPE_TONE: Record<string, string> = {
  CUSTOMER: "text-sky-600",
  VENDOR: "text-accent",
  SHAREHOLDER: "text-violet-600",
  OTHER: "text-slate-700",
};

export function SubledgerView({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("");
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", type: "CUSTOMER", openingBalance: "" });
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["subledger", clientId],
    queryFn: async () => {
      const [r, a] = await Promise.all([
        fetch(`/api/clients/${clientId}/subledgers`),
        fetch(`/api/clients/${clientId}/subledgers/aging`),
      ]);
      if (!r.ok || !a.ok) throw new Error("Gagal memuat subledger");
      return {
        rows: ((await r.json()) as { data: SubledgerRow[] }).data,
        aging: ((await a.json()) as { data: AgingRow[] }).data,
      };
    },
  });

  const { data: ledger, isLoading: ledgerLoading, error: ledgerError } = useQuery({
    queryKey: ["subledger-ledger", clientId, activeCode],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/subledgers/${encodeURIComponent(activeCode!)}/ledger`);
      if (!res.ok) throw new Error("Gagal memuat buku besar pembantu");
      return ((await res.json()) as { data: LedgerRow[] }).data;
    },
    enabled: !!activeCode,
  });

  const createSubledger = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/subledgers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          type: form.type,
          openingBalance: Number(form.openingBalance) || 0,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan");
    },
    onSuccess: () => {
      setShowForm(false);
      setForm({ code: "", name: "", type: "CUSTOMER", openingBalance: "" });
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: ["subledger", clientId] });
    },
    onError: (e) => setSaveError((e as Error).message),
  });

  if (isLoading) return <div className="p-6 text-sm text-slate-700">Memuat buku besar pembantu…</div>;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

  const rows = data?.rows ?? [];
  const aging = data?.aging;

  const filtered = typeFilter ? rows.filter((r) => r.type === typeFilter) : rows;

  return (
    <div className="space-y-5">
      {/* ── Aging Piutang ── */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-900">⏳ Aging Piutang (Pelanggan)</h3>
          <p className="text-xs text-slate-700">Umur piutang per pelanggan — dari jurnal dengan kode bantu.</p>
        </div>
        {!aging || aging.length === 0 ? (
          <p className="p-4 text-xs text-slate-700">
            Belum ada pelanggan dengan transaksi. Impor kertas kerja (sheet Kode + Jurnal) untuk mengisi.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-2">Pelanggan</th>
                  {aging[0]!.buckets.map((b) => (
                    <th key={b.bucket} className="px-3 py-2 text-right">{b.label}</th>
                  ))}
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {aging.map((a) => (
                  <tr key={a.code} className="border-t border-slate-200/60 text-slate-700">
                    <td className="px-4 py-2">
                      <span className="font-mono text-[10px] text-slate-700">{a.code}</span> {a.name}
                    </td>
                    {a.buckets.map((b) => (
                      <td key={b.bucket} className={`px-3 py-2 text-right font-mono ${b.amount > 0 && b.bucket === "90+" ? "text-rose-600" : ""}`}>
                        {b.amount ? formatCurrencyRp(b.amount) : "—"}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900">{formatCurrencyRp(a.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Master Subledger ── */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-medium text-slate-900">📒 Buku Besar Pembantu</h3>
            <p className="text-xs text-slate-700">Master kode bantu (CT-* pelanggan, AP-* pemasok, SH-* saham).</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800"
            >
              <option value="">Semua tipe</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[#ffffff] hover:bg-[#1f49ce]"
            >
              + Tambah
            </button>
          </div>
        </div>

        {showForm && (
          <div className="grid gap-2 border-b border-slate-200 bg-slate-50/50 p-3 md:grid-cols-5">
            <input
              placeholder="Kode (CT-010)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
            />
            <input
              placeholder="Nama"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
            >
              <option value="CUSTOMER">Pelanggan</option>
              <option value="VENDOR">Pemasok</option>
              <option value="SHAREHOLDER">Pemegang Saham</option>
              <option value="OTHER">Lainnya</option>
            </select>
            <input
              placeholder="Saldo awal"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => createSubledger.mutate()}
              disabled={createSubledger.isPending || !form.code.trim() || !form.name.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[#ffffff] disabled:opacity-40"
            >
              Simpan
            </button>
            {saveError && <p className="text-xs text-rose-600 md:col-span-5">{saveError}</p>}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2">Kode</th>
                <th className="px-4 py-2">Nama</th>
                <th className="px-3 py-2">Tipe</th>
                <th className="px-3 py-2 text-right">Saldo Awal</th>
                <th className="px-3 py-2 text-right">Debet</th>
                <th className="px-3 py-2 text-right">Kredit</th>
                <th className="px-3 py-2 text-right">Saldo</th>
                <th className="px-3 py-2">Aktivitas Terakhir</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-200/60 text-slate-700">
                  <td className="px-4 py-2 font-mono text-slate-700">{r.code}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className={`px-3 py-2 ${TYPE_TONE[r.type] ?? ""}`}>{TYPE_LABEL[r.type] ?? r.type}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.openingBalance ? formatCurrencyRp(r.openingBalance) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.debit ? formatCurrencyRp(r.debit) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.credit ? formatCurrencyRp(r.credit) : "—"}</td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${r.balance < 0 ? "text-accent" : "text-slate-900"}`}>
                    {formatCurrencyRp(r.balance)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{r.lastActivity ?? "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setActiveCode(r.code)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-700 hover:border-accent/50"
                    >
                      Buku Besar
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-700">
                    Belum ada subledger. Import kertas kerja Excel (sheet Kode) otomatis membuat master ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Buku Besar Pembantu (detail) ── */}
      {activeCode && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-900">
              📜 Buku Besar Pembantu — <span className="font-mono">{activeCode}</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveCode(null)}
              className="text-xs text-slate-700 hover:text-slate-700"
            >
              ✕ Tutup
            </button>
          </div>
          {ledgerLoading ? (
            <p className="p-4 text-xs text-slate-700">Memuat…</p>
          ) : ledgerError ? (
            <p className="p-4 text-xs text-rose-600">{(ledgerError as Error).message}</p>
          ) : !ledger || ledger.length === 0 ? (
            <p className="p-4 text-xs text-slate-700">Belum ada transaksi untuk subledger ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-2">Tanggal</th>
                    <th className="px-3 py-2">Bukti</th>
                    <th className="px-3 py-2">Keterangan</th>
                    <th className="px-3 py-2">Akun</th>
                    <th className="px-3 py-2 text-right">Debet</th>
                    <th className="px-3 py-2 text-right">Kredit</th>
                    <th className="px-4 py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l, i) => (
                    <tr key={i} className="border-t border-slate-200/60 text-slate-700">
                      <td className="px-4 py-2 font-mono text-slate-700">{l.date}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{l.bukti ?? "—"}</td>
                      <td className="px-3 py-2">{l.description}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{l.accountCode}</td>
                      <td className="px-3 py-2 text-right font-mono">{l.debit ? formatCurrencyRp(l.debit) : ""}</td>
                      <td className="px-3 py-2 text-right font-mono">{l.credit ? formatCurrencyRp(l.credit) : ""}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900">{formatCurrencyRp(l.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
