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
