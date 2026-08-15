"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Result = { intent: string; answer: string };

/** Command bar AI (⌘K) — tanya data / minta draft / penjelasan, dari mana saja. */
export function AiCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOpen((v) => !v);
    }
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Gagal menjawab");
      setResult(body.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-accent/50 hover:text-accent"
        title="Tanya AI (⌘K)"
      >
        <span aria-hidden>✨</span>
        <span className="hidden sm:inline">Tanya AI</span>
        <kbd className="rounded border border-line bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Tanya AI">
          <div className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-card shadow-2xl">
            <form onSubmit={submit} className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span aria-hidden>✨</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Contoh: "Berapa klien aktif & transaksi hari ini?"'
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                aria-label="Pertanyaan ke AI"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[#0b1120] transition hover:bg-[#ffdf6b] disabled:opacity-50"
              >
                {loading ? "…" : "Kirim"}
              </button>
            </form>

            <div className="max-h-[50vh] overflow-y-auto p-4 text-sm">
              {error ? (
                <p className="text-red-300">{error}</p>
              ) : result ? (
                <div className="space-y-2">
                  <span className="inline-block rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-300">
                    {result.intent === "ask" ? "Data firma" : result.intent === "draft" ? "Draft jurnal" : result.intent === "explain" ? "Penjelasan" : "Bantuan"}
                  </span>
                  <p className="whitespace-pre-wrap text-slate-200">{result.answer}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Tanya apa saja soal data firma, minta draft jurnal, atau minta penjelasan istilah akuntansi/pajak. AI tidak melakukan aksi tulis — Anda tetap yang menyetujui.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
