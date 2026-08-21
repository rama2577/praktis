/**
 * F5B-Lanjutan — Generator XML skema DJP: e-Faktur PPN & e-Bupot PPh 23/4(2).
 * Format representatif yang siap diimpor ke aplikasi Core Tax DJP
 * (e-Faktur 4.0 / e-Bupot unifikasi). Murni, tanpa IO.
 */

import { TAX_CODE_CATALOG } from "./tax";

// ── Util ─────────────────────────────────────────────────────────────────────

/** NPWP "01.234.567.8-901.000" → 16 digit angka "0123456789010000". */
export function normalizeNpwp(npwp: string | null | undefined): string {
  if (!npwp) return "";
  const digits = npwp.replace(/\D/g, "");
  return digits.padEnd(16, "0").slice(0, 16);
}

function escXml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const fmt = (n: number) => n.toFixed(2);

/** Kode objek pajak e-Bupot dari taxCode: "PPH23-104" → "104". */
export function objectCodeOf(taxCode: string): string {
  const m = /PPH(?:23|42)-(\d{3})/.exec(taxCode);
  return m ? m[1] : "";
}

// ── Tipe input ───────────────────────────────────────────────────────────────

export type TaxLineForXml = {
  id: string;
  entryDate: string; // ISO
  description: string | null;
  taxCode: string | null;
  taxBase: number; // DPP
  amount: number; // PPN atau PPh
};

export type EfakturContext = {
  npwp: string;
  nama: string;
  alamat?: string;
  period: string; // "2026-08"
  clientName: string;
};

export type EBupotContext = {
  npwp: string;
  nama: string;
  period: string;
  clientName: string;
};

// ── e-Faktur XML ─────────────────────────────────────────────────────────────

/**
 * Bangun XML e-Faktur (faktur pajak keluaran) dari baris PPN Keluaran.
 * NoFaktur: kode transaksi "01" + seri 13 digit (deterministik dari indeks).
 */
export function buildEfakturXml(lines: TaxLineForXml[], ctx: EfakturContext): string {
  const npwp = normalizeNpwp(ctx.npwp);
  const [year, month] = ctx.period.split("-");
  const fakturs = lines
    .filter((l) => l.taxCode?.startsWith("PPN-OUT"))
    .map((l, i) => {
      const serial = "01" + String(i + 1).padStart(13, "0");
      const tgl = (l.entryDate ?? `${year}-${month}-01`).slice(0, 10);
      return `  <Faktur>
    <NPWP>${escXml(npwp)}</NPWP>
    <Nama>${escXml(ctx.nama)}</Nama>
    <Alamat>${escXml(ctx.alamat ?? "")}</Alamat>
    <NoFaktur>${serial}</NoFaktur>
    <TglFaktur>${tgl}</TglFaktur>
    <JumlahDpp>${fmt(l.taxBase)}</JumlahDpp>
    <JumlahPpn>${fmt(l.amount)}</JumlahPpn>
    <JumlahPpnBm>0.00</JumlahPpnBm>
    <KeteranganTambahan>${escXml(l.description ?? "")}</KeteranganTambahan>
  </Faktur>`;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<eFaktur versi="4.0" masa="${escXml(month)}" tahun="${escXml(year)}">
${fakturs.join("\n")}
</eFaktur>
`;
}

// ── e-Bupot XML (PPh 23 & 4(2)) ──────────────────────────────────────────────

/**
 * Bangun XML e-Bupot (bukti potong PPh 23 / PPh 4(2)) dari baris pemotongan.
 * NPWP penerima: bila notes baris memuat "npwp:XX...", dipakai; selain itu kosong
 * (petunjuk: lengkapi sebelum upload).
 */
export function buildEBupotXml(lines: TaxLineForXml[], ctx: EBupotContext): string {
  const npwp = normalizeNpwp(ctx.npwp);
  const [year, month] = ctx.period.split("-");
  const buktis = lines
    .filter((l) => l.taxCode?.startsWith("PPH23") || l.taxCode?.startsWith("PPH42"))
    .map((l, i) => {
      const code = objectCodeOf(l.taxCode ?? "");
      const meta = TAX_CODE_CATALOG[l.taxCode ?? ""];
      const rate = meta?.rate ?? 0;
      const penerima = ""; // diisi dari data lawan transaksi (vendor) — tahap lanjut
      return `  <BuktiPotong>
    <npwpPemotong>${escXml(npwp)}</npwpPemotong>
    <namaPemotong>${escXml(ctx.nama)}</namaPemotong>
    <npwpPenerima>${escXml(penerima)}</npwpPenerima>
    <kodeObjekPajak>${escXml(code)}</kodeObjekPajak>
    <masa>${escXml(month)}</masa>
    <tahun>${escXml(year)}</tahun>
    <jumlahPenghasilanBruto>${fmt(l.taxBase)}</jumlahPenghasilanBruto>
    <tarif>${rate * 100}</tarif>
    <pphYangDipotong>${fmt(l.amount)}</pphYangDipotong>
    <keterangan>${escXml(l.description ?? "")}</keterangan>
  </BuktiPotong>`;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<eBupot masa="${escXml(month)}" tahun="${escXml(year)}">
${buktis.join("\n")}
</eBupot>
`;
}
