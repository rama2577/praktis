"use client";

import { useCallback, useEffect, useState } from "react";

type Snapshot = {
  id: string;
  period: string;
  type: string;
  version: number;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  TRIAL_BALANCE: "Neraca Percobaan",
  JOURNALS: "Daftar Jurnal",
};

export function PortalSnapshots({ token }: { token: string }) {
  const [items, setItems] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/${token}/snapshots`);
      if (!res.ok) throw new Error("Gagal memuat laporan");
      const data = (await res.json()) as { data: Snapshot[] };
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
        <h2 className="text-sm font-semibold">Laporan & Versi</h2>
        <p className="mt-1 text-xs text-slate-600">
          Setiap periode yang dikunci tim akuntan tersimpan sebagai versi — bisa diunduh kapan saja.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-600">Memuat laporan…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-slate-600">
          Belum ada laporan. Laporan akan muncul setelah periode tutup buku dikunci oleh tim akuntan.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-2"
            >
              <div>
                <p className="text-sm text-slate-800">
                  {TYPE_LABELS[s.type] ?? s.type} — Periode {s.period}{" "}
                  <span className="text-xs text-slate-600">v{s.version}</span>
                </p>
                <p className="text-xs text-slate-600">
                  {new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/portal/${token}/snapshots?id=${s.id}&format=csv`}
                  className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:border-yellow-400/50 hover:text-amber-600"
                >
                  ↓ CSV
                </a>
                <a
                  href={`/api/portal/${token}/snapshots?id=${s.id}&format=xlsx`}
                  className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:border-yellow-400/50 hover:text-amber-600"
                >
                  ↓ XLSX
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
