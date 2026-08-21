"use client";

/* Data-fetching di mount (async) — setState hanya setelah await.
   Rule set-state-in-effect = false positive untuk pola ini. */
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

type Profile = {
  mappingStatus: "NONE" | "LEARNING" | "REVIEW" | "READY";
  coaMapping: Record<string, { accountCode: string; accountName: string; note?: string }>;
  reportTemplates: Record<string, unknown>;
  rules: Record<string, unknown>;
  sourcePeriod?: string | null;
};

const STATUS_TONE: Record<Profile["mappingStatus"], "neutral" | "accent" | "warning" | "positive"> = {
  NONE: "neutral",
  LEARNING: "accent",
  REVIEW: "warning",
  READY: "positive",
};

const STATUS_LABELS: Record<Profile["mappingStatus"], string> = {
  NONE: "Belum dipetakan",
  LEARNING: "Sedang belajar",
  REVIEW: "Perlu Review",
  READY: "Siap Dipakai",
};

export function ClientProfilePanel({
  clientId,
  canEdit,
}: {
  clientId: string;
  canEdit: boolean;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form belajar mapping
  const [rawList, setRawList] = useState("");
  const [sourcePeriod, setSourcePeriod] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/profile`);
      if (!res.ok) throw new Error("Gagal memuat profil klien");
      const data = (await res.json()) as { profile: Profile | null; mappingHint: string | null };
      setProfile(data.profile);
      setHint(data.mappingHint);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function learn(e: React.FormEvent) {
    e.preventDefault();
    if (rawList.trim().length < 10) {
      setError("Tempel daftar akun klien dulu (minimal 10 karakter)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/profile/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawAccountList: rawList, sourcePeriod: sourcePeriod || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal belajar mapping");
      setRawList("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal menyetujui mapping");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const status = profile?.mappingStatus ?? "NONE";
  const entries = Object.entries(profile?.coaMapping ?? {});

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Profil Klien (AI Mapping)</h2>
          <p className="mt-0.5 text-xs text-slate-700">
            Mapping COA klien → akun standar supaya transaksi langsung terklasifikasi benar.
          </p>
        </div>
        <StatusBadge label={STATUS_LABELS[status]} tone={STATUS_TONE[status]} />
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {!loading && hint && (
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 font-mono text-[11px] leading-relaxed text-emerald-700/80">
          {hint}
        </pre>
      )}

      {/* COA klien (template industri / hasil import) — selalu tampil ringkas */}
      {!loading && entries.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-accent hover:underline">
            Lihat COA Klien ({entries.length} akun)
          </summary>
          <div className="mt-2 grid max-h-64 grid-cols-2 gap-x-4 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700 md:grid-cols-3">
            {entries.map(([kode, v]) => (
              <div key={kode} className="truncate" title={`${kode} — ${v.accountName}`}>
                <span className="text-slate-700">{kode}</span> {v.accountName}
              </div>
            ))}
          </div>
        </details>
      )}

      {!loading && status === "REVIEW" && canEdit && (
        <div className="mt-3">
          <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700">
            {JSON.stringify(profile?.coaMapping ?? {}, null, 2)}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void approve()}
            className="mt-3 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? "Menyimpan…" : "✓ Setujui Mapping (→ Siap Dipakai)"}
          </button>
        </div>
      )}

      {!loading && status === "READY" && (
        <div className="mt-3 text-xs text-slate-700">
          {entries.length > 0 ? (
            <>
              {entries.length} akun klien sudah dipetakan
              {profile?.sourcePeriod ? ` (belajar dari periode ${profile.sourcePeriod})` : ""}.
              Pipeline AI otomatis memakai mapping ini untuk dokumen klien.
            </>
          ) : (
            "Profil aktif tanpa mapping COA."
          )}
        </div>
      )}

      {canEdit && status !== "READY" && (
        <form onSubmit={learn} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <div>
            <p className="text-xs text-slate-700">
              <span className="font-medium text-slate-800">Belajar dari daftar akun klien:</span>{" "}
              tempel daftar akun (dari COA klien, format: kode pipe nama per baris) — AI akan
              memetakan ke akun standar, lalu Anda review.
            </p>
            <textarea
              value={rawList}
              onChange={(e) => setRawList(e.target.value)}
              rows={5}
              placeholder={"1000 | Kas\n4110 | Penjualan Barang\n5100 | Beban Gaji"}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 focus:border-accent/50 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={sourcePeriod}
              onChange={(e) => setSourcePeriod(e.target.value)}
              placeholder="Periode sumber (mis. 2026-01)"
              className="w-48 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-accent/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1f49ce] disabled:opacity-50"
            >
              {busy ? "Memproses…" : "🤖 Belajar Mapping"}
            </button>
          </div>
        </form>
      )}

      {loading && <div className="mt-3 text-xs text-slate-700">Memuat profil…</div>}
    </div>
  );
}
