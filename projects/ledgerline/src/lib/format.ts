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
