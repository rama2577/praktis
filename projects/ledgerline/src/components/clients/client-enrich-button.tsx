"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  enrichment: { taxId: string | null; industry: string | null; address: string | null; confidence: number };
  applied: { taxId?: string; industry?: string };
};

/** Tombol "✨ Enrich" — lengkapi NPWP/industri klien dari dokumen referensi (AI). */
export function ClientEnrichButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function enrich() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/enrich`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Gagal enrich data master");
      setResult(body.data);
      const applied = body.data.applied as Result["applied"];
      const parts: string[] = [];
      if (applied.taxId) parts.push(`NPWP ${applied.taxId}`);
      if (applied.industry) parts.push(`Industri ${applied.industry}`);
      setMessage(parts.length ? `Terisi: ${parts.join(" · ")}` : "Tidak ada data baru yang bisa dilengkapi.");
      setState("done");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={enrich}
        disabled={state === "loading"}
        title="Lengkapi NPWP & industri klien otomatis dari dokumen referensi (AI)"
        className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
      >
        {state === "loading" ? "Menganalisis…" : "✨ Enrich"}
      </button>
      {message && (
        <span
          className={`rounded px-2 py-1 text-xs ${
            state === "error" ? "bg-red-500/15 text-red-600" : state === "done" ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-600/30 text-slate-700"
          }`}
        >
          {message}
        </span>
      )}
      {result?.enrichment.confidence != null && state === "done" && (
        <span className="text-[11px] text-slate-500">conf {(result.enrichment.confidence * 100).toFixed(0)}%</span>
      )}
    </div>
  );
}
