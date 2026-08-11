import { NextResponse } from "next/server";
import { buildCsp, generateNonce } from "@/lib/csp";

/**
 * SE-05 — Security headers dinamis per request:
 * - `x-nonce`: nonce CSP untuk inline script Next.js (diterapkan otomatis oleh Next).
 * - `Content-Security-Policy`: ketat di produksi; longgar di dev untuk HMR.
 */
export function middleware() {
  const nonce = generateNonce();
  const response = NextResponse.next();

  response.headers.set("x-nonce", nonce);
  const dev = process.env.NODE_ENV !== "production";
  response.headers.set("Content-Security-Policy", buildCsp(nonce, { dev }));

  return response;
}

export const config = {
  matcher: [
    // Semua kecuali aset statis & berkas publik.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|otf)$).*)",
  ],
};
