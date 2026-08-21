/**
 * KB Seed — Kertas kerja akuntan senior (ASC_2026.xlsx, ARYA USAHA TIRTA CV).
 * Memasukkan pola COA, siklus akuntansi kertas kerja Excel, dan perlakuan
 * akuntansi (penyusutan, mapping SPT) sebagai referensi AI pipeline.
 *
 * Sumber: .openclaw-attachments/20260813-114101-43ed01f9-c4f-ASC_2026.xlsx
 * Idempotent: skip jika name sudah ada.
 *
 * Jalankan: npx tsx scripts/seed-kb-asc-worksheet.ts
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COA_JSON = "/Users/staff/.openclaw-autoclaw/workspace/.openclaw/tmp/asc-coa.json";

type CoaRow = { code: string; name: string; posSaldo: string; posLaporan: string; saldoAwalDebit: number; saldoAwalKredit: number };

function coaTable(): string {
  const rows = JSON.parse(readFileSync(COA_JSON, "utf8")) as CoaRow[];
  // Kelompokkan per klasifikasi (digit pertama)
  const groups = new Map<string, CoaRow[]>();
  for (const r of rows) {
    const g = r.code.match(/^(\d)/)?.[1] ?? "?";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(r);
  }
  const label: Record<string, string> = {
    "1": "AKTIVA", "2": "KEWAJIBAN", "3": "EKUITAS", "4": "PENDAPATAN",
    "5": "BEBAN", "6": "BEBAN LAIN", "7": "PENDAPATAN LAIN", "8": "PENYESUAIAN", "9": "LAINNYA",
  };
  const out: string[] = [];
  for (const [g, items] of [...groups.entries()].sort()) {
    out.push(`\n## ${label[g] ?? g} (${items.length} akun)`);
    for (const it of items) {
      const pos = [it.posSaldo, it.posLaporan].filter(Boolean).join("/");
      out.push(`- ${it.code} | ${it.name}${pos ? ` | ${pos}` : ""}`);
    }
  }
  return out.join("\n");
}

const ITEMS: { name: string; category: string; title: string; build: () => string; tags: string[] }[] = [
  {
    name: "coa-event-management-arya-2026",
    category: "Chart of Accounts (COA)",
    title: "COA Event Management (ARYA USAHA TIRTA, CV) — 196 akun, format X-XXX-XXX",
    build: () => `# COA Event Management — ARYA USAHA TIRTA, CV (Tahun 2026)

Sumber: kertas kerja akuntan senior (ASC_2026.xlsx, sheet "Akun").

## Karakteristik COA
- Format kode: \`X-XXX-XXX\` (grup-subgrup-akun), kompatibel klasifikasi digit-pertama Praktis (1=Aset ... 9=Lainnya).
- Kolom: Kode | Nama Akun | Pos Saldo (Db/Cr) | Pos Laporan (NRC = Neraca, LR = Laba Rugi) | Saldo Awal (D/K).
- 9 klasifikasi: Aktiva (47), Kewajiban (27), Ekuitas (8), Pendapatan (28), Beban (17), Beban Lain (49), Pendapatan Lain (6), Penyesuaian (9), Lainnya (4).
- Akun khas industri event management: Event Management Services Income (4-101), Exhibition/Conference/Sponsorship (4-102), Tour & Surfing Cost, Transaction Cost, Licence & Permit, Space Rental - Exhibition.
- Akun khas UKM Indonesia: Due To/From Subsidiary (1-105), Shareholder's Receivable/Payable (1-104/2-150), Prepaid Taxes (1-107), Value Added Tax (1-108), Mekari Pay Escrow (1-109xx), Rounding (7-70003), Penyesuaian Persediaan (8-80100), Corporate Income Tax (9-101).
- Saldo awal 2026 (contoh): CIMB Niaga 3.043.241; Receivable - Trade 13.548.978; Electronics & IT Equipment 9.550.321; Akum. Penyusutan -476.032. CATATAN: pada export, arah D/K saldo awal tidak selalu konsisten (mis. piutang tampil di kolom Kredit) — validasi normal balance saat migrasi.

## Daftar Akun Lengkap
${coaTable()}`,
    tags: ["coa", "event management", "arya usaha tirta", "chart of accounts", "migrasi"],
  },
  {
    name: "siklus-kertas-kerja-excel-akuntan",
    category: "Keterampilan Akuntansi",
    title: "Siklus Akuntansi Kertas Kerja Excel Akuntan Senior (24 sheet) & Pemetaan ke Praktis",
    build: () => `# Siklus Akuntansi Kertas Kerja Excel — Pola Akuntan Senior Indonesia

Sumber: ASC_2026.xlsx (24 sheet) — pola kertas kerja yang dipakai akuntan senior untuk klien UKM.

## Struktur Kertas Kerja (24 sheet)
1. User & Menu — identitas klien (nama perusahaan, tahun buku).
2. Akun — COA (196 akun) + saldo awal.
3. Kode — kode pembantu (subledger): CT-* = customer, SH-* = shareholder, dll.
4. Jurnal — jurnal umum: Tanggal | Bukti | Keterangan | Kode Akun | Kode Bantu | Debet | Kredit.
5. Buku Besar — ledger per akun.
6. Neraca Lajur — worksheet 10 kolom: Neraca Saldo (D/K) → Laba Rugi (D/K) → Neraca (D/K), per akun, S/D bulan tertentu.
7. Index — indeks jurnal (nomor urut + nomor bukti GL-...).
8. Laba Rugi & Neraca — laporan final.
9. BB Pembantu — buku besar pembantu per kode bantu (customer/vendor).
10. Laporan 2025: NRC_2025, LR_2025, varian (1-12) = matrix 12 kolom per bulan, varian (SPT) = format lampiran SPT dengan kolom Additional/Koreksi, varian (Print).
11. EQ_2025 — laporan perubahan ekuitas.
12. Penyusutan Aset Tetap — daftar aktiva (1.026 baris) + matrix 12 bulan: penyusutan bulanan, akumulasi, nilai buku.

## Pemetaan ke Praktis
- Jurnal → JournalEntry/JournalLine (AI/MANUAL) — kolom Kode Bantu → dimensi (F6B: customer/vendor).
- Neraca Lajur → worksheet 10 kolom Praktis (NS/Penyesuaian/NS Disesuaikan/LR/Neraca) — sudah match.
- Buku Besar → halaman Ledger.
- COA + saldo awal → migrasi via opening balance (belum ada wizard otomatis — perlu import).
- Laporan (1-12) per bulan → multi-period (5 tahun) — Praktis menampilkan per tahun, bukan matrix 12 bulan.
- Versi SPT → belum ada; perlu format lampiran SPT 1771.
- Penyusutan → asset register + auto-depreciation Praktis; format matrix bulanan Excel perlu diadopsi.

## Aturan Migrasi (agar "no gap")
1. Import COA dulu (kode & nama harus identik agar jurnal lama cocok).
2. Validasi saldo awal: normal balance (aset/akun D; kewajiban/ekuitas/pendapatan K; beban D) — export Excel sering menukar kolom.
3. Jurnal lama (bukti GL-*) → import sebagai jurnal MANUAL dengan bukti asli.
4. Kode bantu → master pelanggan/pemasok sebelum jurnal direview AI.
5. Verifikasi: total NS = total jurnal = total Buku Besar = Neraca Lajur (konsistensi 4 arah).`,
    tags: ["siklus akuntansi", "kertas kerja", "worksheet", "migrasi", "excel", "neraca lajur"],
  },
  {
    name: "perlakuan-penyusutan-aset-tetap",
    category: "Referensi PSAK",
    title: "Perlakuan Penyusutan Aset Tetap — Pola Kertas Kerja (matrix 12 bulan)",
    build: () => `# Perlakuan Penyusutan Aset Tetap — Pola Kertas Kerja Akuntan

Sumber: ASC_2026.xlsx, sheet "Penyusutan Aset Tetap" (1.026 baris).

## Pola yang Dipakai
- Daftar aktiva per kelompok (mis. Electronics & IT Equipment, akun 1-120-005; Akumulasi 1-120-105).
- Matrix 12 bulan (JAN–DES): kolom penyusutan per bulan → Total Penyusutan Bulan → Total Akumulasi Penyusutan → Total Nilai Buku.
- Contoh (klien): Total Akum. Penyusutan Nov 277.068; Nilai Buku Nov 9.273.253; Penyusutan Bulan Des 198.964; Akum. Des 476.032; Nilai Buku Des 9.074.289.
- Akun beban: 6-201 Depreciation & Amortization (6 sub-akun).

## Treatment yang Direkomendasikan (SAK ETAP / PSAK 16)
1. Metode garis lurus (straight-line) — dominan di UKM; nilai sisa umumnya 0 atau 10%.
2. Penyusutan bulanan = (harga perolehan − nilai sisa) / umur manfaat bulan.
3. Jurnal bulanan: Db Beban Penyusutan (6-201-xxx) / Kr Akumulasi Penyusutan (1-120-105).
4. Umur manfaat umum: IT & elektronik 4 tahun, kendaraan 8 tahun, bangunan 20 tahun, peralatan 4–8 tahun.
5. Saat penjualan/penghapusan: keluarkan dari register, hitung laba/rugi pelepasan.
6. Fiskal (SPT 1771-IV): gunakan tarif/kelompok penyusutan fiskal bila berbeda dengan komersial — buat rekonsiliasi fiskal.

## Integrasi Praktis
- FixedAsset → DepreciationSchedule → jurnal otomatis per periode (fitur depreciateClientPeriod).
- Pastikan akun beban & akumulasi ter-map ke COA klien (pola 6-201 / 1-120-1xx).
- Untuk migrasi, import nilai buku & akumulasi awal per aset dari kolom matrix.`,
    tags: ["penyusutan", "aset tetap", "depreciation", "akumulasi", "psak 16", "sak etap"],
  },
  {
    name: "mapping-laporan-spt-1771",
    category: "Peraturan Pajak",
    title: "Mapping Laporan Keuangan ke Format SPT Tahunan (1771) — Pola Kertas Kerja",
    build: () => `# Mapping Laporan ke SPT Tahunan Badan (1771) — Pola Kertas Kerja

Sumber: ASC_2026.xlsx — sheet LR_2025 (1-12) (SPT) dan NRC_2025 (SPT).

## Struktur Laporan Versi SPT
- Income Statement (SPT): baris per pos laba rugi + kolom bulan Jan–Des + "Up to Dec" + kolom **Additional** dan **Koreksi** — kolom koreksi fiskal (beda tetap/tetap & beda waktu).
- Balance Sheet (SPT): pos aset/kewajiban/ekuitas sesuai lampiran 1771-II.
- Contoh klien (2025): Total Revenue 470.778.195; Total Sales Cost ASC 116.572.028; Tour & Surfing Cost 16.995.000; Transaction Cost 80.439.296 (+ koreksi/additional 13.548.978).

## Mapping Umum ke Lampiran SPT 1771
1. 1771-I — Perhitungan Penghasilan Kena Pajak (PKP): laba usaha + koreksi fiskal + kompensasi kerugian.
2. 1771-II — Neraca: aset lancar/tidak lancar, kewajiban, ekuitas (sesuai pos NRC SPT).
3. 1771-III — Laba rugi: pendapatan usaha, beban, laba sebelum pajak (sesuai pos LR SPT).
4. 1771-IV — Penyusutan & amortisasi fiskal (per kelompok: bangunan/non-bangunan, tarif fiskal).
5. 1771-V — Kredit pajak: PPh 22/23/25/29 yang telah dibayar.
6. 1771-VI — Daftar pemegang saham & dividen.

## Aturan yang Perlu Dipegang AI
- Setiap pos laporan komersial harus punya padanan pos SPT; selisih = koreksi fiskal (Additional/Koreksi).
- Bedakan beda tetap (denda, representasi tanpa daftar nominatif) vs beda waktu (penyusutan, cadangan).
- CV (bukan PT) tetap wajib 1771 bila omzet > 4,8 M atau memilih norma/normal; 0,5% final (PP 55/2022) bila memenuhi ketentuan UMKM.
- PPN: rekonsiliasi 1111 (bulanan) dengan akun PPN 1-108.`,
    tags: ["spt", "1771", "pajak", "koreksi fiskal", "laporan", "rekonsiliasi fiskal"],
  },
];

async function main() {
  const now = new Date();
  let created = 0;
  let skipped = 0;
  for (const it of ITEMS) {
    const existing = await prisma.knowledgeItem.findFirst({
      where: { category: it.category, name: it.name },
    });
    if (existing) {
      console.log(`  ↪ skip ${it.name} (sudah ada)`);
      skipped++;
      continue;
    }
    const content = it.build();
    await prisma.knowledgeItem.create({
      data: {
        category: it.category,
        name: it.name,
        title: it.title,
        content,
        version: 1,
        effectiveDate: now,
        status: "ACTIVE",
        changeNote: "Seed dari kertas kerja ASC_2026.xlsx (ARYA USAHA TIRTA, CV) — upload 2026-08-13",
      },
    });
    console.log(`  ✅ ${it.name} (${content.length} chars)`);
    created++;
  }
  console.log(`Selesai: ${created} dibuat, ${skipped} sudah ada.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
