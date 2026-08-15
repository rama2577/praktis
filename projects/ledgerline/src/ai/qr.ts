import { PNG } from "pngjs";
import jsQR from "jsqr";
import { normalizeNpwp } from "@/server/client-profile";

/**
 * T2.3 — Parse QR e-Faktur: decode QR dari PNG (hasil render halaman PDF scan
 * via mupdf) lalu ekstrak NPWP, nomor faktur, DPP & PPN.
 */

export type EfakturQr = {
  npwp: string | null;
  invoiceNumber: string | null;
  totalDpp: string | null;
  totalPpn: string | null;
  raw: string;
};

/** Decode QR dari buffer PNG → string data (null bila tidak ada QR). */
export function decodeQrPng(buffer: Buffer): string | null {
  try {
    const png = PNG.sync.read(buffer);
    const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: "attemptBoth" });
    return code?.data ?? null;
  } catch {
    return null;
  }
}

const NPWP_RE = /\b\d{2}\.?\d{3}\.?\d{3}\.?\d-?\d{3}\.?\d{3}\b/;
const INVOICE_RE = /\d{3}\.\d{3}-\d{2}\.\d{8}/;
const DPP_RE = /(?:DPP|DASAR PENGENAAN PAJAK)[^\d]*([\d.,]+)/i;
const PPN_RE = /(?:PPN|PAJAK PERTAMBAHAN NILAI)[^\d]*([\d.,]+)/i;

/** Parse string hasil decode QR e-Faktur → field terstruktur (pure — testable). */
export function parseEfakturQr(raw: string): EfakturQr {
  const npwpMatch = raw.match(NPWP_RE);
  const invMatch = raw.match(INVOICE_RE);
  const dppMatch = raw.match(DPP_RE);
  const ppnMatch = raw.match(PPN_RE);
  return {
    npwp: normalizeNpwp(npwpMatch?.[0] ?? null),
    invoiceNumber: invMatch?.[0] ?? null,
    totalDpp: dppMatch?.[1] ?? null,
    totalPpn: ppnMatch?.[1] ?? null,
    raw,
  };
}

/** Format ringkas data QR untuk disisipkan ke teks ekstraksi. */
export function qrToText(qr: EfakturQr): string {
  const parts: string[] = [];
  if (qr.npwp) parts.push(`NPWP: ${qr.npwp}`);
  if (qr.invoiceNumber) parts.push(`No. Faktur: ${qr.invoiceNumber}`);
  if (qr.totalDpp) parts.push(`DPP: ${qr.totalDpp}`);
  if (qr.totalPpn) parts.push(`PPN: ${qr.totalPpn}`);
  return parts.length ? parts.join("\n") : qr.raw;
}
