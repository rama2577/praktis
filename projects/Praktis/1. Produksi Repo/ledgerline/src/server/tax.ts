/**
 * F5B — Core Tax (M9): kode pajak per baris jurnal + generator SPT.
 * Inti murni & deterministik: katalog kode pajak (PPN / PPh 21/22/23/4(2)/25),
 * inferensi otomatis dari akun, klasifikasi baris, export CSV skema DJP
 * (SPT 1111, SPT 1771 + rekonsiliasi fiskal, e-Bupot 23, PPh 4(2), PPh 21).
 */

import type { TrialBalanceRow } from "@/server/trial-balance";

// ── Katalog kode pajak ───────────────────────────────────────────────────────

export type TaxCodeEntry = {
  code: string;
  label: string;
  type: "PPN_OUT" | "PPN_IN" | "PPH21" | "PPH22" | "PPH23" | "PPH42" | "PPH25";
  rate?: number; // tarif untuk PPh potong/pungut
  lampiran?: string; // lampiran SPT 1111: B1/B2/B3
};

export const TAX_CODE_CATALOG: Record<string, TaxCodeEntry> = {
  "PPN-OUT-01": { code: "PPN-OUT-01", label: "PPN Keluaran — Faktur 01 (penyerahan biasa)", type: "PPN_OUT", lampiran: "B1" },
  "PPN-OUT-02": { code: "PPN-OUT-02", label: "PPN Keluaran — Faktur 02 (pemungut bendahara)", type: "PPN_OUT", lampiran: "B1" },
  "PPN-IN-01": { code: "PPN-IN-01", label: "PPN Masukan — dapat dikreditkan", type: "PPN_IN", lampiran: "B2" },
  "PPN-IN-03": { code: "PPN-IN-03", label: "PPN Masukan — tidak dapat dikreditkan", type: "PPN_IN", lampiran: "B3" },
  "PPH21-21-100-01": { code: "PPH21-21-100-01", label: "PPh 21 — Pegawai Tetap", type: "PPH21" },
  "PPH21-21-100-02": { code: "PPH21-21-100-02", label: "PPh 21 — Pegawai Tidak Tetap", type: "PPH21" },
  "PPH21-21-100-03": { code: "PPH21-21-100-03", label: "PPh 21 — Bukan Pegawai", type: "PPH21" },
  "PPH22-22-100-01": { code: "PPH22-22-100-01", label: "PPh 22 — Impor / pembelian", type: "PPH22", rate: 0.025 },
  "PPH23-103": { code: "PPH23-103", label: "PPh 23 — Sewa", type: "PPH23", rate: 0.02 },
  "PPH23-104": { code: "PPH23-104", label: "PPh 23 — Jasa Teknik", type: "PPH23", rate: 0.02 },
  "PPH23-105": { code: "PPH23-105", label: "PPh 23 — Jasa Lainnya", type: "PPH23", rate: 0.02 },
  "PPH23-106": { code: "PPH23-106", label: "PPh 23 — Hadiah & Penghargaan", type: "PPH23", rate: 0.02 },
  "PPH42-401": { code: "PPH42-401", label: "PPh 4(2) — Sewa tanah/bangunan", type: "PPH42", rate: 0.1 },
  "PPH42-402": { code: "PPH42-402", label: "PPh 4(2) — Pengalihan hak tanah/bangunan", type: "PPH42", rate: 0.025 },
  "PPH42-403": { code: "PPH42-403", label: "PPh 4(2) — Jasa konstruksi (kualifikasi kecil)", type: "PPH42", rate: 0.02 },
  "PPH42-404": { code: "PPH42-404", label: "PPh 4(2) — Jasa konstruksi (non-kualifikasi)", type: "PPH42", rate: 0.04 },
  "PPH25-25-100-01": { code: "PPH25-25-100-01", label: "PPh 25 — Angsuran bulanan", type: "PPH25" },
};

export const TAX_CODE_OPTIONS = Object.values(TAX_CODE_CATALOG);

export const TAX_TYPE_LABELS: Record<TaxCodeEntry["type"], string> = {
  PPN_OUT: "PPN Keluaran",
  PPN_IN: "PPN Masukan",
  PPH21: "PPh 21",
  PPH22: "PPh 22",
  PPH23: "PPh 23",
  PPH42: "PPh 4(2)",
  PPH25: "PPh 25",
};

/** Akun pajak standar → kode pajak otomatis. */
const ACCOUNT_TAX_MAP: Record<string, { code: string; dppFrom?: "credit" | "debit" }> = {
  "2-2000": { code: "PPN-OUT-01", dppFrom: "credit" },
  "1-1400": { code: "PPN-IN-01", dppFrom: "debit" },
  "2-2100": { code: "PPH21-21-100-01", dppFrom: "credit" },
  "2-2200": { code: "PPH22-22-100-01", dppFrom: "credit" },
  "2-2300": { code: "PPH23-104", dppFrom: "credit" },
  "2-2400": { code: "PPH42-401", dppFrom: "credit" },
  "2-2500": { code: "PPH25-25-100-01", dppFrom: "credit" },
};

export type TaxLine = {
  lineId: string;
  journalId: string;
  journalDescription: string | null;
  entryDate: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  notes: string | null;
  /** Kode pajak: override tersimpan di DB, else hasil inferensi. */
  taxCode: string | null;
  taxBase: number | null;
};

/** Infer kode pajak dari akun & catatan (override menang). */
export function inferTaxCode(accountCode: string, notes?: string | null): string | null {
  const mapped = ACCOUNT_TAX_MAP[accountCode];
  if (!mapped) return null;
  if (accountCode === "1-1400" && /tidak dapat|tidak bisa dikredit/i.test(notes ?? "")) {
    return "PPN-IN-03";
  }
  return mapped.code;
}

/** DPP baris pajak: nilai debit/credit sesuai arah akun. */
export function taxBaseOf(line: Pick<TaxLine, "accountCode" | "debit" | "credit">): number {
  const mapped = ACCOUNT_TAX_MAP[line.accountCode];
  if (!mapped) return 0;
  return mapped.dppFrom === "credit" ? line.credit : line.debit;
}

// ── Klasifikasi & ringkasan ──────────────────────────────────────────────────

export type TaxSummary = {
  period: string;
  ppnOut: { dpp: number; ppn: number; rows: TaxLine[] };
  ppnIn: { dpp: number; ppn: number; rows: TaxLine[] };
  ppnInNonCreditable: { dpp: number; ppn: number; rows: TaxLine[] };
  pph23: { dpp: number; ppn: number; rows: TaxLine[] };
  pph42: { dpp: number; ppn: number; rows: TaxLine[] };
  pph21: { dpp: number; ppn: number; rows: TaxLine[] };
  pph22: { dpp: number; ppn: number; rows: TaxLine[] };
  pph25: { dpp: number; ppn: number; rows: TaxLine[] };
};

const PPN_RATE = 0.11;

function pphFromDpp(dpp: number, rate?: number): number {
  return Math.round(dpp * (rate ?? 0) * 100) / 100;
}

/** Klasifikasi baris pajak dari jurnal periode (kode = override ?? infer). */
export function classifyTaxLines(lines: TaxLine[], period: string): TaxSummary {
  const empty = () => ({ dpp: 0, ppn: 0, rows: [] as TaxLine[] });
  const out: TaxSummary = {
    period,
    ppnOut: empty(),
    ppnIn: empty(),
    ppnInNonCreditable: empty(),
    pph23: empty(),
    pph42: empty(),
    pph21: empty(),
    pph22: empty(),
    pph25: empty(),
  };

  for (const line of lines) {
    const code = line.taxCode ?? inferTaxCode(line.accountCode, line.notes);
    if (!code) continue;
    const meta = TAX_CODE_CATALOG[code];
    if (!meta) continue;
    const base = line.taxBase ?? taxBaseOf(line);

    const push = (bucket: { dpp: number; ppn: number; rows: TaxLine[] }, dpp: number, tax: number) => {
      bucket.dpp += dpp;
      bucket.ppn += tax;
      bucket.rows.push(line);
    };

    switch (meta.type) {
      case "PPN_OUT":
        push(out.ppnOut, base, Math.round(base * PPN_RATE * 100) / 100);
        break;
      case "PPN_IN":
        if (meta.lampiran === "B3") push(out.ppnInNonCreditable, base, Math.round(base * PPN_RATE * 100) / 100);
        else push(out.ppnIn, base, Math.round(base * PPN_RATE * 100) / 100);
        break;
      case "PPH23":
        push(out.pph23, base, pphFromDpp(base, meta.rate));
        break;
      case "PPH42":
        push(out.pph42, base, pphFromDpp(base, meta.rate));
        break;
      case "PPH21":
        push(out.pph21, base, pphFromDpp(base, meta.rate ?? 0.05));
        break;
      case "PPH22":
        push(out.pph22, base, pphFromDpp(base, meta.rate));
        break;
      case "PPH25":
        push(out.pph25, base, pphFromDpp(base, meta.rate ?? 0.22));
        break;
    }
  }
  return out;
}

// ── Generator CSV (skema DJP-like) ───────────────────────────────────────────

function esc(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

/** SPT 1111 — CSV lampiran B1 (PK), B2 (PM dikreditkan), B3 (PM tidak dikreditkan). */
export function buildSpt1111Csv(summary: TaxSummary, clientName: string): string {
  const header = ["Masa", "Tahun", "Lampiran", "Jenis", "Akun", "Deskripsi", "DPP", "PPN"];
  const rows: string[] = [header.join(",")];
  const [year, month] = summary.period.split("-");
  const add = (lampiran: string, jenis: string, line: TaxLine, dpp: number, ppn: number) => {
    rows.push(
      [month, year, lampiran, jenis, line.accountCode, line.journalDescription ?? line.accountName, dpp.toFixed(2), ppn.toFixed(2)]
        .map(esc)
        .join(","),
    );
  };
  for (const l of summary.ppnOut.rows) add("B1", "PPN Keluaran", l, taxBaseOf(l), Math.round(taxBaseOf(l) * PPN_RATE * 100) / 100);
  for (const l of summary.ppnIn.rows) add("B2", "PPN Masukan (dikreditkan)", l, taxBaseOf(l), Math.round(taxBaseOf(l) * PPN_RATE * 100) / 100);
  for (const l of summary.ppnInNonCreditable.rows) add("B3", "PPN Masukan (tidak dikreditkan)", l, taxBaseOf(l), Math.round(taxBaseOf(l) * PPN_RATE * 100) / 100);
  rows.push(esc(`RINGKASAN ${clientName} — ${summary.period}`));
  rows.push(
    ["", "", "", "Total PK (B1)", summary.ppnOut.dpp.toFixed(2), summary.ppnOut.ppn.toFixed(2)].join(","),
  );
  rows.push(
    ["", "", "", "Total PM dikreditkan (B2)", summary.ppnIn.dpp.toFixed(2), summary.ppnIn.ppn.toFixed(2)].join(","),
  );
  rows.push(
    ["", "", "", "Total PM tidak dikreditkan (B3)", summary.ppnInNonCreditable.dpp.toFixed(2), summary.ppnInNonCreditable.ppn.toFixed(2)].join(","),
  );
  return rows.join("\n");
}

/** SPT 1771 — rekonsiliasi fiskal: laba komersial → koreksi → laba fiskal → PPh badan. */
export function buildSpt1771(
  clientName: string,
  period: string,
  tb: Pick<TrialBalanceRow, "accountCode" | "accountName" | "classification" | "balance">[],
  opts: {
    /** Koreksi fiskal aset (F5A): jumlah (penyusutan komersial − fiskal) per periode. */
    assetCorrection?: number;
    /** Koreksi fiskal tetap manual (positif/negatif). */
    permanentCorrections?: { label: string; amount: number }[];
  } = {},
): { csv: string; result: Spt1771Result } {
  const pendapatan = tb.filter((r) => r.classification === "PENDAPATAN").reduce((s, r) => s + r.balance, 0);
  const beban = tb.filter((r) => r.classification === "BEBAN").reduce((s, r) => s + r.balance, 0);
  const labaKomersial = Math.round((pendapatan - beban) * 100) / 100;

  const corrections = [
    ...(opts.permanentCorrections ?? []),
    ...(opts.assetCorrection ? [{ label: "Beda temporer penyusutan (Pasal 11)", amount: opts.assetCorrection }] : []),
  ];
  const koreksiTotal = Math.round(corrections.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  const labaFiskal = Math.round((labaKomersial + koreksiTotal) * 100) / 100;
  const pphTerutang = Math.round(Math.max(0, labaFiskal) * 0.22 * 100) / 100;

  const result: Spt1771Result = { pendapatan, beban, labaKomersial, corrections, koreksiTotal, labaFiskal, pphTerutang };

  const lines: string[] = [];
  lines.push(esc(`SPT 1771 — ${clientName} — ${period}`));
  lines.push(["Pendapatan (4-xxxx)", pendapatan.toFixed(2)].map(esc).join(","));
  lines.push(["Beban (5-xxxx)", beban.toFixed(2)].map(esc).join(","));
  lines.push(["LABA KOMERSIAL", labaKomersial.toFixed(2)].map(esc).join(","));
  for (const c of corrections) lines.push([`Koreksi fiskal: ${c.label}`, c.amount.toFixed(2)].map(esc).join(","));
  lines.push(["KOREKSI FISKAL TOTAL", koreksiTotal.toFixed(2)].map(esc).join(","));
  lines.push(["LABA FISKAL", labaFiskal.toFixed(2)].map(esc).join(","));
  lines.push(["PPh BADAN TERUTANG (22%)", pphTerutang.toFixed(2)].map(esc).join(","));
  return { csv: lines.join("\n"), result };
}

export type Spt1771Result = {
  pendapatan: number;
  beban: number;
  labaKomersial: number;
  corrections: { label: string; amount: number }[];
  koreksiTotal: number;
  labaFiskal: number;
  pphTerutang: number;
};

/** e-Bupot PPh 23 — CSV skema KAP/KJS 411122. */
export function buildEBupotCsv(summary: TaxSummary, period: string): string {
  const header = ["Masa", "Tahun", "KAP/KJS", "Jenis", "Akun", "Deskripsi", "DPP", "Tarif", "PPh"];
  const rows: string[] = [header.join(",")];
  const [year, month] = period.split("-");
  for (const l of summary.pph23.rows) {
    const code = l.taxCode ?? inferTaxCode(l.accountCode, l.notes) ?? "PPH23-105";
    const meta = TAX_CODE_CATALOG[code];
    const dpp = l.taxBase ?? taxBaseOf(l);
    rows.push(
      [month, year, code.replace("PPH23-", ""), meta?.label ?? code, l.accountCode, l.journalDescription ?? "", dpp.toFixed(2), (meta?.rate ?? 0).toFixed(2), pphFromDpp(dpp, meta?.rate).toFixed(2)]
        .map(esc)
        .join(","),
    );
  }
  rows.push(esc(`TOTAL PPh 23: ${summary.pph23.ppn.toFixed(2)}`));
  return rows.join("\n");
}

/** PPh 4(2) — CSV KAP 411128. */
export function buildPPh42Csv(summary: TaxSummary, period: string): string {
  const header = ["Masa", "Tahun", "KAP/KJS", "Jenis", "Akun", "Deskripsi", "DPP", "Tarif", "PPh"];
  const rows: string[] = [header.join(",")];
  const [year, month] = period.split("-");
  for (const l of summary.pph42.rows) {
    const code = l.taxCode ?? inferTaxCode(l.accountCode, l.notes) ?? "PPH42-401";
    const meta = TAX_CODE_CATALOG[code];
    const dpp = l.taxBase ?? taxBaseOf(l);
    rows.push(
      [month, year, code.replace("PPH42-", ""), meta?.label ?? code, l.accountCode, l.journalDescription ?? "", dpp.toFixed(2), (meta?.rate ?? 0).toFixed(2), pphFromDpp(dpp, meta?.rate).toFixed(2)]
        .map(esc)
        .join(","),
    );
  }
  rows.push(esc(`TOTAL PPh 4(2): ${summary.pph42.ppn.toFixed(2)}`));
  return rows.join("\n");
}

/** PPh 21 — CSV ringkasan masa (1721). */
export function buildPPh21Csv(summary: TaxSummary, period: string): string {
  const header = ["Masa", "Tahun", "Jenis", "Akun", "Deskripsi", "DPP", "PPh 21"];
  const rows: string[] = [header.join(",")];
  const [year, month] = period.split("-");
  for (const l of summary.pph21.rows) {
    const dpp = l.taxBase ?? taxBaseOf(l);
    rows.push([month, year, "PPh 21", l.accountCode, l.journalDescription ?? "", dpp.toFixed(2), pphFromDpp(dpp, 0.05).toFixed(2)].map(esc).join(","));
  }
  rows.push(esc(`TOTAL PPh 21: ${summary.pph21.ppn.toFixed(2)}`));
  return rows.join("\n");
}
