"use client";

import { useMemo, useState } from "react";
import type { KnowledgeEntry } from "@/server/knowledge";

const EXT_TONE: Record<string, string> = {
  MD: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  CSV: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export function KnowledgeBrowser({ entries }: { entries: KnowledgeEntry[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.preview.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.category, (map.get(e.category) ?? 0) + 1);
    return [...map.entries()];
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari referensi (mis. PPN, PSAK 72, piutang)…"
          aria-label="Cari knowledge base"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-yellow-400/50 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2 text-xs">
          {categories.map(([cat, count]) => (
            <span key={cat} className="rounded-full border border-line bg-card px-2.5 py-1 text-slate-400">
              {cat} · {count}
            </span>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          Tidak ada referensi yang cocok dengan pencarian.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((entry) => (
            <li key={entry.name} className="overflow-hidden rounded-xl border border-line bg-card/40">
              <button
                type="button"
                onClick={() => setOpen(open === entry.name ? null : entry.name)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${EXT_TONE[entry.ext] ?? "border-slate-600 bg-slate-700/40 text-slate-300"}`}>
                    {entry.ext}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-slate-200">{entry.name}</p>
                    <p className="text-xs text-slate-500">
                      {entry.category} · {formatBytes(entry.sizeBytes)}
                    </p>
                  </div>
                </div>
                <span aria-hidden className="text-slate-500">
                  {open === entry.name ? "▾" : "▸"}
                </span>
              </button>
              {open === entry.name && (
                <pre className="max-h-80 overflow-auto border-t border-line bg-slate-950/60 px-4 py-3 text-xs leading-relaxed text-slate-300">
                  {entry.preview}
                  {entry.preview.length >= 800 ? "\n… (konten dipotong — lihat file sumber)" : ""}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
