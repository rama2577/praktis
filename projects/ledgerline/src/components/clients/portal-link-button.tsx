"use client";

import { useState } from "react";

type ButtonState = "idle" | "loading" | "copied" | "error";

/**
 * Tombol "Salin Link Portal" — buat/reset token portal klien lalu salin URL
 * ke clipboard (akuntan tinggal paste ke WA/email klien).
 */
export function PortalLinkButton({ clientId }: { clientId: string }) {
  const [state, setState] = useState<ButtonState>("idle");

  const handleClick = async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch(`/api/clients/${clientId}/portal-token`, { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Gagal membuat link");
      await navigator.clipboard.writeText(data.url);
      setState("copied");
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const label =
    state === "loading"
      ? "Membuat link…"
      : state === "copied"
        ? "Link tersalin ✓"
        : state === "error"
          ? "Gagal — coba lagi"
          : "Salin Link Portal";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "loading"}
      title="Buat link portal klien & salin ke clipboard untuk dibagikan"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        state === "copied"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
          : state === "error"
            ? "border-red-500/40 bg-red-500/10 text-red-600"
            : "border-line bg-card text-slate-800 hover:border-accent/50 hover:text-accent"
      } disabled:cursor-wait disabled:opacity-60`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {label}
    </button>
  );
}
