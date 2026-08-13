/**
 * Dropdown sortir klien (Outbox) — client component tipis; navigasi via router.
 * Agar akuntan tidak melihat semua klien dalam satu tabel kerja.
 */
"use client";

import { useRouter } from "next/navigation";

export function OutboxClientFilter({
  clients,
  value,
  total,
}: {
  clients: { id: string; name: string }[];
  value: string;
  total: number;
}) {
  const router = useRouter();
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      Sortir klien
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/dashboard/outbox?client=${encodeURIComponent(v)}` : "/dashboard/outbox");
        }}
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-yellow-400/50 focus:outline-none"
      >
        <option value="">Semua klien ({total})</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </label>
  );
}
