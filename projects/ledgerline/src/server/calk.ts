/**
 * Catatan atas Laporan Keuangan (CALK) — dihasilkan otomatis (rule-based)
 * dari profil klien, aset tetap, dan trial balance.
 */

import type { TrialBalanceRow } from "./trial-balance";

export type CalkSection = {
  number: number;
  title: string;
  paragraphs: string[];
  items?: { label: string; value: string }[];
};

export type Calk = {
  clientName: string;
  period: string;
  sections: CalkSection[];
};

type Input = {
  clientName: string;
  period: string;
  rows: TrialBalanceRow[];
  profile?: {
    legalName?: string | null;
    industry?: string | null;
    address?: string | null;
    taxId?: string | null;
    description?: string | null;
  } | null;
  depreciationMethod?: string | null;
  assetCount?: number | null;
};

const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
const fmtRupiah = (n: number) => `Rp${fmt(n)}`;

export function buildCalk(input: Input): Calk {
  const { clientName, period, rows, profile, depreciationMethod, assetCount } = input;
  const sections: CalkSection[] = [];

  // 1. Umum
  sections.push({
    number: 1,
    title: "Umum",
    paragraphs: [
      `${profile?.legalName || clientName} (\"Entitas\") adalah entitas yang bergerak di bidang ${profile?.industry || "usaha jasa/dagang"}${profile?.address ? `, berkedudukan di ${profile.address}` : ""}. Laporan keuangan untuk periode yang berakhir ${period} disusun dan disajikan oleh manajemen entitas.`,
      `Nomor Pokok Wajib Pajak (NPWP) entitas: ${profile?.taxId || "tidak diisi pada profil klien"}.`,
    ],
    items: profile?.description
      ? [{ label: "Kegiatan utama", value: profile.description }]
      : undefined,
  });

  // 2. Kebijakan akuntansi
  const aset = rows.filter((r) => r.classification === "ASET");
  const totalAset = aset.reduce((s, r) => s + r.balance, 0);
  sections.push({
    number: 2,
    title: "Ikhtisar Kebijakan Akuntansi Penting",
    paragraphs: [
      "a) Dasar penyusunan: laporan keuangan disusun berdasarkan biaya historis dengan basis akrual, sesuai Standar Akuntansi Keuangan Entitas Tanpa Akuntabilitas Publik (SAK ETAP).",
      "b) Mata uang pelaporan: Rupiah (IDR). Angka disajikan dalam Rupiah penuh.",
      `c) Aset tetap: disusutkan dengan metode ${depreciationMethod || "garis lurus"} selama estimasi masa manfaat ekonomis${assetCount !== null && assetCount !== undefined ? ` (${assetCount} aset tercatat)` : ""}.`,
      "d) Pengakuan pendapatan: diakui saat barang/jasa diserahkan dan risiko manfaat telah berpindah.",
    ],
  });

  // 3. Rincian akun material
  const liabilitas = rows.filter((r) => r.classification === "LIABILITAS");
  const ekuitas = rows.filter((r) => r.classification === "EKUITAS");
  const pendapatan = rows.filter((r) => r.classification === "PENDAPATAN");
  const beban = rows.filter((r) => r.classification === "BEBAN");
  const totalPendapatan = pendapatan.reduce((s, r) => s + r.balance, 0);
  const totalBeban = beban.reduce((s, r) => s + r.balance, 0);
  const laba = totalPendapatan - totalBeban;

  const material = (rs: TrialBalanceRow[], limit: number) =>
    [...rs].filter((r) => r.balance !== 0).sort((a, b) => b.balance - a.balance).slice(0, limit);

  const items: { label: string; value: string }[] = [
    { label: "Total aset", value: fmtRupiah(totalAset) },
    { label: "Total liabilitas", value: fmtRupiah(liabilitas.reduce((s, r) => s + r.balance, 0)) },
    { label: "Total ekuitas", value: fmtRupiah(ekuitas.reduce((s, r) => s + r.balance, 0)) },
    { label: "Pendapatan periode", value: fmtRupiah(totalPendapatan) },
    { label: "Beban periode", value: fmtRupiah(totalBeban) },
    { label: "Laba (rugi) periode", value: fmtRupiah(laba) },
  ];
  for (const r of material(aset, 5)) items.push({ label: `Aset — ${r.accountName}`, value: fmtRupiah(r.balance) });
  for (const r of material(liabilitas, 4)) items.push({ label: `Liabilitas — ${r.accountName}`, value: fmtRupiah(r.balance) });
  for (const r of material(pendapatan, 4)) items.push({ label: `Pendapatan — ${r.accountName}`, value: fmtRupiah(r.balance) });
  for (const r of material(beban, 4)) items.push({ label: `Beban — ${r.accountName}`, value: fmtRupiah(r.balance) });

  sections.push({
    number: 3,
    title: "Rincian Pos-Pos Material",
    paragraphs: ["Rincian pos-pos signifikan dalam laporan keuangan periode berjalan:"],
    items,
  });

  // 4. Peristiwa setelah periode pelaporan
  sections.push({
    number: 4,
    title: "Peristiwa Setelah Periode Pelaporan",
    paragraphs: [
      "Tidak terdapat peristiwa signifikan setelah tanggal laporan yang memerlukan penyesuaian atau pengungkapan.",
    ],
  });

  // 5. Tanggung jawab manajemen
  sections.push({
    number: 5,
    title: "Tanggung Jawab Manajemen",
    paragraphs: [
      "Manajemen entitas bertanggung jawab atas penyusunan dan penyajian wajar laporan keuangan, serta internal control yang dipandang perlu untuk menyusun laporan keuangan yang bebas dari kesalahan material.",
      "Catatan ini merupakan bagian yang tidak terpisahkan dari laporan keuangan periode yang berakhir " + period + ".",
    ],
  });

  return { clientName, period, sections };
}

/** Export CALK sebagai Markdown (siap ditempel ke Word/Google Docs). */
export function calkMarkdown(c: Calk): string {
  const out: string[] = [];
  out.push(`# CATATAN ATAS LAPORAN KEUANGAN`);
  out.push(`**${c.clientName}** — Periode yang berakhir ${c.period}`);
  out.push("");
  for (const s of c.sections) {
    out.push(`## ${s.number}. ${s.title}`);
    out.push("");
    for (const p of s.paragraphs) out.push(p);
    out.push("");
    if (s.items) {
      for (const it of s.items) out.push(`- **${it.label}:** ${it.value}`);
      out.push("");
    }
  }
  return out.join("\n");
}

export function calkCsv(c: Calk): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const out: string[] = [esc("Bagian"), esc("Isi"), esc("Nilai")];
  for (const s of c.sections) {
    for (const p of s.paragraphs) out.push([esc(`${s.number}. ${s.title}`), esc(p), ""].join(","));
    for (const it of s.items ?? []) out.push([esc(`${s.number}. ${s.title}`), esc(it.label), esc(it.value)].join(","));
  }
  return out.join("\n");
}
