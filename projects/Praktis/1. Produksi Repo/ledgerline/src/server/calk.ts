import ExcelJS from "exceljs";
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

  const hppRows = beban.filter(
    (r) => r.accountName.toLowerCase().includes("hpp") || r.accountName.toLowerCase().includes("pokok penjualan"),
  );
  const hppTotal = hppRows.reduce((sm, r) => sm + r.balance, 0);

  // ── Section 3: Rincian per-akun material dengan narasi ──
  const perAset = material(aset, 5);
  const perLiabilitas = material(liabilitas, 3);
  const perPendapatan = material(pendapatan, 3);
  const perBeban = material(beban, 3);

  const b3paragraphs: string[] = [
    "Rincian pos-pos signifikan dalam laporan keuangan periode berjalan disajikan di bawah ini.",
  ];

  // Aset
  if (perAset.length > 0) {
    const assetList = perAset.map((r) => {
      const pct = totalAset > 0 ? ((r.balance / totalAset) * 100).toFixed(1) : "0";
      const isCurr = r.accountCode.startsWith("1-1");
      return `${r.accountName} sebesar ${fmtRupiah(r.balance)} (${pct}% dari total aset${isCurr ? ", termasuk aset lancar" : ""})`;
    }).join("; ");
    b3paragraphs.push(`Aset terbesar entitas meliputi: ${assetList}.`);
  }

  // Liabilitas
  if (perLiabilitas.length > 0) {
    const liabList = perLiabilitas.map((r) => {
      const isShort = r.accountCode.startsWith("2-1");
      return `${r.accountName} sebesar ${fmtRupiah(r.balance)}${isShort ? " (jangka pendek)" : ""}`;
    }).join("; ");
    b3paragraphs.push(`Liabilitas signifikan: ${liabList}.`);
  }

  // Pendapatan
  if (perPendapatan.length > 0 && totalPendapatan > 0) {
    const revList = perPendapatan.map((r) => 
      `${r.accountName} sebesar ${fmtRupiah(r.balance)} (${((r.balance / totalPendapatan) * 100).toFixed(0)}% dari total pendapatan)`
    ).join("; ");
    b3paragraphs.push(`Komposisi pendapatan: ${revList}.`);
  }

  // Beban
  if (perBeban.length > 0 && totalBeban > 0) {
    const expList = perBeban.map((r) => 
      `${r.accountName} sebesar ${fmtRupiah(r.balance)} (${((r.balance / totalBeban) * 100).toFixed(0)}% dari total beban)`
    ).join("; ");
    b3paragraphs.push(`Komposisi beban: ${expList}.`);
  }

  // Rasio piutang/persediaan jika relevan
  const piutangDagang = aset.find((r) => r.accountCode.startsWith("1-12") && r.balance > 0);
  if (piutangDagang && totalPendapatan > 0) {
    const turnover = totalPendapatan / piutangDagang.balance;
    const days = 365 / turnover;
    b3paragraphs.push(`Perputaran piutang usaha tercatat ${turnover.toFixed(1)}× per periode (rata-rata ${days.toFixed(0)} hari penagihan).`);
  }

  const persediaan = aset.find((r) => r.accountCode.startsWith("1-13") && r.balance > 0);
  if (persediaan && hppTotal > 0) {
    const turnover = hppTotal / persediaan.balance;
    b3paragraphs.push(`Perputaran persediaan tercatat ${turnover.toFixed(1)}× per periode.`);
  }

  // Depresiasi + aset tetap
  if (assetCount && assetCount > 0) {
    b3paragraphs.push(`Entitas memiliki ${assetCount} aset tetap yang disusutkan dengan metode ${depreciationMethod || "garis lurus"}. Rincian aset tetap tersedia dalam daftar aset tetap terpisah.`);
  }

  sections.push({
    number: 3,
    title: "Rincian Pos-Pos Material",
    paragraphs: b3paragraphs,
    items: [
      { label: "Total aset", value: fmtRupiah(totalAset) },
      { label: "Total liabilitas", value: fmtRupiah(liabilitas.reduce((acc, r) => acc + r.balance, 0)) },
      { label: "Total ekuitas", value: fmtRupiah(ekuitas.reduce((acc, r) => acc + r.balance, 0)) },
      { label: "Pendapatan periode", value: fmtRupiah(totalPendapatan) },
      { label: "Beban periode", value: fmtRupiah(totalBeban) },
      { label: "Laba (rugi) periode", value: fmtRupiah(laba) },
    ],
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

/** Export CALK sebagai XLSX (satu sheet, kolom Bagian/Isi/Nilai). */
export async function calkXlsx(c: Calk): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("CALK");
  ws.addRow(["BAGIAN", "ISI", "NILAI"]);
  ws.addRow(["CATATAN ATAS LAPORAN KEUANGAN", `${c.clientName} — Periode yang berakhir ${c.period}`, ""]);
  for (const s of c.sections) {
    const head = `${s.number}. ${s.title}`;
    if (s.paragraphs.length === 0 && !s.items) continue;
    ws.addRow([head, "", ""]);
    for (const p of s.paragraphs) ws.addRow(["", p, ""]);
    for (const it of s.items ?? []) ws.addRow(["", it.label, it.value]);
  }
  ws.columns = [{ width: 34 }, { width: 90 }, { width: 24 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}