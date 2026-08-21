/**
 * SE-05 — Content-Security-Policy builder (pure, testable).
 * Nonce disuntikkan per-request oleh middleware (header `x-nonce`),
 * Next.js otomatis menerapkannya ke inline script yang di-render.
 */

export type CspOptions = {
  /** Mode pengembangan: melonggarkan untuk HMR (eval + websocket lokal). */
  dev?: boolean;
};

export function buildCsp(nonce: string, opts: CspOptions = {}): string {
  const dev = opts.dev ?? false;

  const scriptSrc = dev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}'`;

  const connectSrc = dev
    ? `'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*`
    : `'self'`;

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // next/font menyuntik <style> inline font-face — butuh unsafe-inline untuk style.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];

  return directives.join("; ");
}

/** Nonce acak per request (Web Crypto — tersedia di Edge & Node runtime). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
