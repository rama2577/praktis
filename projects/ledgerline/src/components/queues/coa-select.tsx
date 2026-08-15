"use client";

import { useMemo, useRef, useState } from "react";

export type CoaAccount = { accountCode: string; accountName: string; note?: string };

/** Filter + urut abjad nama akun (pure — testable). */
export function filterSortCoa(accounts: CoaAccount[], query: string): CoaAccount[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? accounts.filter(
        (a) => a.accountName.toLowerCase().includes(q) || a.accountCode.toLowerCase().includes(q),
      )
    : accounts;
  return [...filtered].sort((a, b) => a.accountName.localeCompare(b.accountName, "id"));
}

/**
 * Dropdown COA klien dengan pencarian nama akun (abjad). Saat memilih akun,
 * isi accountCode + accountName sekaligus.
 */
export function CoaSelect({
  accounts,
  code,
  name,
  onChange,
  disabled,
}: {
  accounts: CoaAccount[];
  code: string;
  name: string;
  onChange: (accountCode: string, accountName: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => filterSortCoa(accounts, query), [accounts, query]);

  const label = code || name ? `${code}${name ? " — " + name : ""}` : "Pilih akun…";

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className="flex w-full items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-left text-xs text-slate-800 hover:border-accent/50 focus:border-accent/50 focus:outline-none disabled:opacity-50"
        title={label}
      >
        <span className="truncate font-mono">{label}</span>
        <span aria-hidden className="text-[10px] text-slate-700">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 z-50 mt-1 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-200 p-1.5">
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama akun…"
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 placeholder:text-slate-700 focus:border-accent/50 focus:outline-none"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {list.length === 0 ? (
                <li className="px-3 py-2 text-xs text-slate-700">Tidak ada akun cocok.</li>
              ) : (
                list.slice(0, 100).map((a) => (
                  <li key={a.accountCode}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(a.accountCode, a.accountName);
                        setOpen(false);
                      }}
                      className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-xs text-slate-800 hover:bg-hover"
                    >
                      <span className="w-20 shrink-0 font-mono text-slate-700">{a.accountCode}</span>
                      <span className="truncate">{a.accountName}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
