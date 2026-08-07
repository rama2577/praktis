"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Tombol nonaktifkan/aktifkan klien (ADMIN/SENIOR). */
export function ClientStatusAction({
  clientId,
  clientName,
  currentStatus,
}: {
  clientId: string;
  clientName: string;
  currentStatus: "ACTIVE" | "INACTIVE";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = currentStatus === "ACTIVE";

  async function toggle() {
    if (busy) return;
    const action = isActive ? "nonaktifkan" : "aktifkan";
    const confirmed = window.confirm(
      isActive
        ? `Nonaktifkan "${clientName}"? Klien tidak akan muncul di antrian baru.`
        : `Aktifkan kembali "${clientName}"?`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: isActive ? "INACTIVE" : "ACTIVE" }),
    });

    if (res.ok) {
      router.refresh();
    } else if (res.status === 401 || res.status === 403) {
      setError("Tidak memiliki akses.");
    } else {
      setError(`Gagal ${action} klien.`);
    }
    setBusy(false);
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`rounded-lg border px-2.5 py-1 text-xs transition disabled:opacity-40 ${
          isActive
            ? "border-line text-slate-400 hover:border-red-500/40 hover:text-red-400"
            : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
        }`}
      >
        {busy ? "Memproses..." : isActive ? "Nonaktifkan" : "Aktifkan"}
      </button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </span>
  );
}
