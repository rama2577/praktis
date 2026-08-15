"use client";

import { useCallback, useEffect, useState } from "react";

type JournalLine = { accountCode: string; accountName: string; debit: number; credit: number };
type Journal = {
  id: string;
  description: string | null;
  entryDate: string;
  status: string;
  journalType: string;
  lines: JournalLine[];
  explanation: string;
  summary: string;
};

const TYPE_LABELS: Record<string, string> = {
  AI: "Otomatis",
  MANUAL: "Manual",
  ADJUSTING: "Penyesuaian",
};

export function PortalJournals({ token }: { token: string }) {
  const [items, setItems] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/${token}/journals`);
      if (!res.ok) throw new Error("Gagal memuat transaksi");
      const data = (await res.json()) as { data: Journal[] };
      setItems(data.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    async function start() {
      await load();
    }
    void start();
  }, [load]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Transaksi Saya</h2>
        <p className="mt-1 text-xs text-slate-700">
          Ringkasan pencatatan yang sudah disetujui tim akuntan — dalam bahasa sederhana.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-700">Memuat transaksi…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-slate-700">
          Belum ada transaksi tercatat. Setelah dokumen Anda diproses, ringkasan transaksi akan
          muncul di sini.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((j) => (
            <li key={j.id} className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                <span className="font-medium text-slate-800">{j.description ?? "Transaksi"}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                  {TYPE_LABELS[j.journalType] ?? j.journalType}
                </span>
                <span>{new Date(j.entryDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{j.summary}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-accent/90 hover:text-accent">
                  Lihat penjelasan lengkap
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{j.explanation}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
