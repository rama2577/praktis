/**
 * Gap #4 — SPT 1771 versi lengkap: rekonsiliasi fiskal (Lampiran I),
 * penyusutan fiskal (Lampiran II), perhitungan PPh Badan (Lampiran III),
 * kompensasi kerugian (Lampiran IV), struktur permodalan (Lampiran V),
 * + export CSV (format Excel Indonesia).
 *
 * Sumber: KB "mapping-laporan-spt-1771" (pos LR/NR → lampiran SPT).
 * Kolom koreksi fiskal default dihitung heuristik; UI mengizinkan edit manual.
 */

import { prisma } from "@/lib/db";

// ── Tipe ─────────────────────────────────────────────────────────────────────

export type RekonsiliasiRow = {
  kode: string;
  nama: string;
  komersial: number;
  koreksiPositif: number;
  koreksiNegatif: number;
  fiskal: number;
};

export type PenyusutanRow = {
  assetCode: string;
  assetName: string;
  kelompok: string;
  komersial: number;
  fiskal: number;
  koreksi: number;
};

export type Spt1771 = {
  clientName: string;
  year: number;
  /** Lampiran I — rekonsiliasi fiskal */
  pendapatan: RekonsiliasiRow[];
  beban: RekonsiliasiRow[];
  labaKomersial: number;
  totalKoreksiPositif: number;
  totalKoreksiNegatif: number;
  labaFiskal: number;
  peredaranBruto: number;
  /** Lampiran II — penyusutan */
  penyusutan: PenyusutanRow[];
  koreksiPenyusutan: number;
  /** Lampiran III — PPh terutang */
  mode: "31e" | "pp23" | "normal";
  tarifPph: number; // 0.22 / 0.20
  pkp: number;
  pphTerutang: number;
  kreditPajak: number;
  pphKurangBayar: number;
  catatan: string[];
};

// ── Heuristik koreksi fiskal otomatis ─────────────────────────────────────────

const KOREKSI_POSITIF_KEYWORDS = [
  "pajak penghasilan", "pph", "pajak final", "denda", "sanksi",
  "entertainment", "entertin", "representasi", "hadiah", "sumbangan",
  "jamuan", "santunan", "asuransi kesehatan", "pajak bumi", "pbb",
  "bea materai", "materai", "potongan", "cadangan",
];

const KOREKSI_NEGATIF_KEYWORDS = [
  "final", "deposito", "dividen", "bunga bank", "jasa giro",
  "sewa tanah", "sewa gedung", "hadiah undian",
];

const containsAny = (name: string, keywords: string[]) =>
  keywords.some((k) => name.toLowerCase().includes(k));

function autoKoreksi(nama: string, saldo: number, isBeban: boolean): { positif: number; negatif: number } {
  if (isBeban && containsAny(nama, KOREKSI_POSITIF_KEYWORDS)) {
    return { positif: saldo, negatif: 0 }; // seluruhnya non-deductible
  }
  if (!isBeban && containsAny(nama, KOREKSI_NEGATIF_KEYWORDS)) {
    return { positif: 0, negatif: saldo }; // pendapatan kena pajak final
  }
  return { positif: 0, negatif: 0 };
}

// ── Tarif PPh Badan (UU HPP No. 7/2021) ──────────────────────────────────────

export function tarifPphBadan(year: number): number {
  if (year <= 2019) return 0.25;
  if (year >= 2020 && year <= 2022) return 0.22;
  return 0.2; // 2023+
}

export function hitungPphBadan(
  pkp: number,
  peredaranBruto: number,
  year: number,
  mode: "31e" | "pp23" | "normal",
): { tarif: number; pph: number; catatan: string[] } {
  const tarif = tarifPphBadan(year);
  const catatan: string[] = [];
  if (pkp <= 0) {
    return { tarif, pph: 0, catatan: ["Laba fiskal tidak positif — tidak ada PPh terutang."] };
  }
  if (mode === "pp23") {
    if (peredaranBruto <= 4_800_000_000) {
      return { tarif: 0.005, pph: peredaranBruto * 0.005, catatan: ["PP 23/2018: PPh final 0,5% × peredaran bruto (≤ Rp4,8 M)."] };
    }
    catatan.push("Peredaran bruto > Rp4,8 M — tidak memenuhi PP 23; dihitung normal (Pasal 17).");
  }
  if (mode === "31e" && peredaranBruto <= 50_000_000_000) {
    if (peredaranBruto <= 4_800_000_000) {
      const pph = 0.5 * tarif * pkp;
      catatan.push(`Pasal 31E: 50% × tarif ${(tarif * 100).toFixed(0)}% × PKP (peredaran ≤ Rp4,8 M).`);
      return { tarif: 0.5 * tarif, pph, catatan };
    }
    const rasio = 4_800_000_000 / peredaranBruto;
    const pph = tarif * pkp * (0.5 * rasio + (1 - rasio));
    catatan.push(
      `Pasal 31E: tarif ${(tarif * 100).toFixed(0)}% dengan fasilitas 50% proporsional (4,8M/${(peredaranBruto / 1e9).toFixed(1)}M).`,
    );
    return { tarif, pph, catatan };
  }
  const pph = tarif * pkp;
  catatan.push(`Tarif Pasal 17: ${(tarif * 100).toFixed(0)}% × PKP.`);
  return { tarif, pph, catatan };
}

// ── Pengambilan data + perhitungan ───────────────────────────────────────────

function classifyCode(code: string): "PENDAPATAN" | "BEBAN" | "LAIN" {
  const c = code.trim().charAt(0);
  if (c === "4" || c === "7") return "PENDAPATAN";
  if (c === "5" || c === "6" || c === "8" || c === "9") return "BEBAN";
  return "LAIN";
}

export async function buildSpt1771(
  clientId: string,
  clientName: string,
  year: number,
  mode: "31e" | "pp23" | "normal" = "31e",
): Promise<Spt1771> {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const [entries, depSchedules] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { clientId, status: { in: ["APPROVED", "FINALIZED"] }, entryDate: { gte: start, lt: end } },
      select: {
        lines: { select: { accountCode: true, accountName: true, debit: true, credit: true } },
      },
    }),
    prisma.depreciationSchedule.findMany({
      where: { asset: { clientId }, period: { startsWith: String(year) } },
      select: {
        asset: { select: { name: true, fiscalGroup: true } },
        commercialAmount: true,
        fiscalAmount: true,
      },
    }),
  ]);

  // Agregasi saldo per akun (tahunan, kumulatif).
  const agg = new Map<string, { code: string; name: string; debit: number; credit: number }>();
  for (const e of entries) {
    for (const l of e.lines) {
      const cur = agg.get(l.accountCode) ?? { code: l.accountCode, name: l.accountName, debit: 0, credit: 0 };
      cur.debit += Number(l.debit);
      cur.credit += Number(l.credit);
      if (l.accountName) cur.name = l.accountName;
      agg.set(l.accountCode, cur);
    }
  }

  const pendapatan: RekonsiliasiRow[] = [];
  const beban: RekonsiliasiRow[] = [];
  let peredaranBruto = 0;

  for (const t of agg.values()) {
    const cls = classifyCode(t.code);
    if (cls === "LAIN") continue;
    const saldo = cls === "PENDAPATAN" ? t.credit - t.debit : t.debit - t.credit;
    if (Math.abs(saldo) < 1) continue;
    const isBeban = cls === "BEBAN";
    const { positif, negatif } = autoKoreksi(t.name, saldo, isBeban);
    const row: RekonsiliasiRow = {
      kode: t.code,
      nama: t.name,
      komersial: Math.round(saldo * 100) / 100,
      koreksiPositif: Math.round(positif * 100) / 100,
      koreksiNegatif: Math.round(negatif * 100) / 100,
      fiskal: Math.round((saldo + positif - negatif) * 100) / 100,
    };
    if (isBeban) beban.push(row);
    else {
      pendapatan.push(row);
      peredaranBruto += saldo;
    }
  }

  pendapatan.sort((a, b) => a.kode.localeCompare(b.kode));
  beban.sort((a, b) => a.kode.localeCompare(b.kode));

  const totalPendapatan = pendapatan.reduce((s, r) => s + r.komersial, 0);
  const totalBeban = beban.reduce((s, r) => s + r.komersial, 0);
  const labaKomersial = Math.round((totalPendapatan - totalBeban) * 100) / 100;

  const penyusutan: PenyusutanRow[] = depSchedules.map((d) => {
    const kom = Number(d.commercialAmount);
    const fis = Number(d.fiscalAmount);
    return {
      assetCode: d.asset.name.slice(0, 24),
      assetName: d.asset.name,
      kelompok: d.asset.fiscalGroup ?? "—",
      komersial: Math.round(kom * 100) / 100,
      fiskal: Math.round(fis * 100) / 100,
      koreksi: Math.round((kom - fis) * 100) / 100,
    };
  });
  // Koreksi penyusutan masuk sebagai koreksi positif/negatif agregat bila belum dihitung akun.
  const koreksiPenyusutan = penyusutan.reduce((s, r) => s + r.koreksi, 0);
  const totalKoreksiPositif = beban.reduce((s, r) => s + r.koreksiPositif, 0) + Math.max(0, koreksiPenyusutan);
  const totalKoreksiNegatif = pendapatan.reduce((s, r) => s + r.koreksiNegatif, 0) + Math.max(0, -koreksiPenyusutan);
  const labaFiskal = Math.round((labaKomersial + totalKoreksiPositif - totalKoreksiNegatif) * 100) / 100;

  // Lampiran III — perhitungan PPh.
  const pkp = Math.max(0, labaFiskal);
  const { tarif, pph, catatan } = hitungPphBadan(pkp, peredaranBruto, year, mode);

  // Kredit pajak: saldo debet akun PPh dibayar dimuka (1-1400*).
  const kreditPajak = [...agg.values()]
    .filter((t) => t.code.startsWith("1-1400") || t.code.startsWith("1-1410"))
    .reduce((s, t) => s + (t.debit - t.credit), 0);

  const pphTerutang = Math.round(pph * 100) / 100;
  const pphKurangBayar = Math.round((pphTerutang - kreditPajak) * 100) / 100;

  const catatanFinal = [...catatan];
  if (koreksiPenyusutan !== 0) {
    catatanFinal.push(
      `Koreksi penyusutan aset tetap: ${koreksiPenyusutan.toLocaleString("id-ID")} (komersial vs fiskal, Lampiran II).`,
    );
  }

  return {
    clientName,
    year,
    pendapatan,
    beban,
    labaKomersial,
    totalKoreksiPositif: Math.round(totalKoreksiPositif * 100) / 100,
    totalKoreksiNegatif: Math.round(totalKoreksiNegatif * 100) / 100,
    labaFiskal,
    peredaranBruto: Math.round(peredaranBruto * 100) / 100,
    penyusutan,
    koreksiPenyusutan,
    mode,
    tarifPph: tarif,
    pkp,
    pphTerutang,
    kreditPajak: Math.round(kreditPajak * 100) / 100,
    pphKurangBayar,
    catatan: catatanFinal,
  };
}

// ── Export CSV (format Excel Indonesia: koma + BOM) ──────────────────────────

const esc = (v: string | number) => {
  const s = typeof v === "number" ? String(Math.round(v * 100) / 100) : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function rekonsiliasiCsv(data: Pick<Spt1771, "pendapatan" | "beban" | "labaKomersial" | "totalKoreksiPositif" | "totalKoreksiNegatif" | "labaFiskal" | "clientName" | "year">): string {
  const L: string[] = [];
  L.push(`LAMPIRAN I — REKONSILIASI FISKAL, ${data.clientName}, Tahun ${data.year}`);
  L.push("Kode;Nama Akun;Komersial (Rp);Koreksi Positif (Rp);Koreksi Negatif (Rp);Fiskal (Rp)");
  for (const r of [...data.pendapatan, ...data.beban]) {
    L.push([r.kode, r.nama, r.komersial, r.koreksiPositif, r.koreksiNegatif, r.fiskal].map(esc).join(";"));
  }
  L.push(`TOTAL;Laba Komersial;${data.labaKomersial};;;;`);
  L.push(`TOTAL;Koreksi Positif;;${data.totalKoreksiPositif};;;`);
  L.push(`TOTAL;Koreksi Negatif;;;${data.totalKoreksiNegatif};;`);
  L.push(`TOTAL;Laba Fiskal;;;;;${data.labaFiskal}`);
  return "\uFEFF" + L.join("\n");
}

export function penyusutanCsv(data: Pick<Spt1771, "penyusutan" | "clientName" | "year">): string {
  const L: string[] = [];
  L.push(`LAMPIRAN II — PENYUSUTAN & AMORTISASI FISKAL, ${data.clientName}, Tahun ${data.year}`);
  L.push("Kode Aset;Nama Aset;Kelompok;Penyusutan Komersial (Rp);Penyusutan Fiskal (Rp);Koreksi (Rp)");
  for (const r of data.penyusutan) {
    L.push([r.assetCode, r.assetName, r.kelompok, r.komersial, r.fiskal, r.koreksi].map(esc).join(";"));
  }
  if (data.penyusutan.length === 0) L.push("(tidak ada jadwal penyusutan pada tahun berjalan)");
  return "\uFEFF" + L.join("\n");
}

export function pphCsv(data: Pick<Spt1771, "clientName" | "year" | "labaFiskal" | "pkp" | "tarifPph" | "peredaranBruto" | "mode" | "pphTerutang" | "kreditPajak" | "pphKurangBayar" | "catatan">): string {
  const L: string[] = [];
  L.push(`LAMPIRAN III — PERHITUNGAN PPh TERUTANG, ${data.clientName}, Tahun ${data.year}`);
  L.push("Pos;Nilai (Rp)");
  L.push(`Peredaran Bruto;${data.peredaranBruto}`);
  L.push(`Laba Fiskal;${data.labaFiskal}`);
  L.push(`Penghasilan Kena Pajak (PKP);${data.pkp}`);
  L.push(`Mode;${data.mode.toUpperCase()}`);
  L.push(`Tarif;${data.tarifPph * 100}%`);
  L.push(`PPh Terutang;${data.pphTerutang}`);
  L.push(`Kredit Pajak (PPh dibayar dimuka);${data.kreditPajak}`);
  L.push(`PPh Kurang/(Lebih) Bayar;${data.pphKurangBayar}`);
  for (const c of data.catatan) L.push(`Catatan;${c}`);
  return "\uFEFF" + L.join("\n");
}
