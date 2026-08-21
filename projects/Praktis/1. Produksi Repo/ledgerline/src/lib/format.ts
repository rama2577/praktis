/**
 * Format angka Rupiah sesuai konvensi knowledge base ledgerline:
 * "Rp" + titik ribuan, tanpa desimal (contoh: Rp 1.500.000).
 */
export function formatCurrencyRp(value: number): string {
  if (!Number.isFinite(value)) {
    return "Rp 0";
  }
  const rounded = Math.round(value);
  const formatted = rounded.toLocaleString("id-ID").replace(/,/g, ".");
  return `Rp ${formatted}`;
}

/**
 * Format ukuran file — "1,2 MB", "450 KB".
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Waktu relatif gaya feed: "baru saja", "5 mnt lalu", "2 jam lalu", "3 hari lalu".
 * `now` diinjeksi agar deterministik & mudah diuji.
 */
export function formatRelativeTime(iso: string | Date, now = new Date()): string {
  const then = typeof iso === "string" ? new Date(iso) : iso;
  const diffSec = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (diffSec < 60) return "baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return then.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
