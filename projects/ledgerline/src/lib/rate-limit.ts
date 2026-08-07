/**
 * Rate limiting — fixed window sederhana.
 * `hits` = jumlah request dalam window; `max` = batas. Rate limited jika hits > max.
 * Pure & unit-testable; adapter Redis ada di route handler.
 */
export function isRateLimited(hits: number, max: number): boolean {
  return hits > max;
}

/** Batas upload dokumen per user per menit. */
export const MAX_UPLOADS_PER_MINUTE = 10;

/** Kunci Redis per user: `rl:upload:{userId}`. */
export function rateLimitKey(scope: string, id: string): string {
  return `rl:${scope}:${id}`;
}
