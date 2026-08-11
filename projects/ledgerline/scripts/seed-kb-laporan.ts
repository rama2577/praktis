/**
 * Seed KB — format laporan keuangan & neraca lajur (dari referensi skill 07).
 *
 * Sumber: dokumen acuan user (2026-08-11) — Worksheet/neraca lajur, Template Laporan
 * Keuangan UMKM (12 sheet), Annual Report PT Unilever Indonesia Tbk 2025.
 *
 * Menambahkan 3 KnowledgeItem kategori "Referensi Laporan" (global, status ACTIVE).
 * Idempotent — aman dijalankan berulang (skip kalau name sudah ada).
 * Jalankan: npx tsx scripts/seed-kb-laporan.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ITEMS: Array<{
  category: string;
  name: string;
  title: string;
  content: string;
}> = [
  {
    category: "Referensi Laporan",
    name: "format-neraca-lajur",
    title: "Format Neraca Lajur (Worksheet Akuntansi)",
    content: `Neraca lajur / worksheet = kertas kerja 10 kolom untuk menyusun laporan keuangan.

Struktur kolom (berpasangan Debit/Kredit):
1. Kode Akun & Nama Akun
2. Neraca Saldo (D/K) — saldo buku besar sebelum penyesuaian
3. Penyesuaian (D/K) — jurnal penyesuaian periode
4. Neraca Saldo Disesuaikan / NSD (D/K) = Neraca Saldo ± Penyesuaian
5. Laba Rugi (D/K) — akun nominal (pendapatan & beban)
6. Neraca (D/K) — akun riil (aset, liabilitas, ekuitas)

Cara kerja:
1. Isi Neraca Saldo dari buku besar.
2. Isi kolom Penyesuaian (contoh ajp: piutang bertambah, persediaan akhir, beban dibayar dimuka yang menjadi beban).
3. Hitung NSD per akun.
4. Pindahkan akun nominal ke kolom Laba Rugi; akun riil ke kolom Neraca.
5. Jumlah debit = jumlah kredit di setiap pasangan kolom; selisih Laba Rugi (laba/rugi bersih) dipindah ke kolom Neraca (baris "Laba") agar Neraca seimbang.
6. Baris akhir: Jumlah, Laba (D/K), Jumlah Akhir.

Contoh (Perusahaan Jurnal Karya, 31 Des 2022, Rp):
- Kas 800.000 D; Piutang dagang 450.000 D + ajp 20.000 D → NSD 470.000 D
- Persediaan 345.000 D; ajp persediaan akhir 300.000 D / 345.000 K → NSD 300.000 D
- Iklan dibayar di muka 18.000 D − ajp 10.000 K → NSD 8.000 D (Neraca); 10.000 ke Beban Iklan (Laba Rugi)
- Peralatan 80.000 D; Utang dagang 240.000 K; Modal 300.000 K`,
  },
  {
    category: "Referensi Laporan",
    name: "format-laporan-umkm",
    title: "Format Laporan Keuangan UMKM (Template 12 Sheet)",
    content: `Alur lengkap: Jurnal Umum → Posting Buku Besar → Neraca Saldo → Worksheet/Neraca Lajur → Laba Rugi → Perubahan Modal → Posisi Keuangan (Neraca) → Arus Kas.

1. Jurnal Umum: Tanggal | Transaksi | Debit | Kredit (debit = kredit per transaksi).
2. Buku Besar per akun: Tanggal | Keterangan | Debit | Kredit | Saldo (berjalan).
3. Neraca Saldo: Kode Akun | Nama Akun | Debit | Kredit + TOTAL (harus sama).
4. Laba Rugi single step: Pendapatan − HPP = Laba Kotor − Total Beban = Laba Sebelum Pajak − Pajak = Laba Bersih.
5. Laba Rugi multiple step:
   Penjualan − Diskon − Retur = Penjualan Bersih
   − HPP (Persediaan Awal + Pembelian − Persediaan Akhir)
   = Laba Kotor
   − Beban Operasional (gaji, promosi, ongkir) − Beban Administrasi (gaji admin, sewa, asuransi)
   = Laba Operasi
   ± Pendapatan/Beban Lain (bunga, sewa)
   = Laba Sebelum Pajak − Pajak = Laba Bersih.
6. Perubahan Modal: Modal Awal + Laba Bersih − Prive = Modal Akhir (kalau rugi: Modal Awal − Rugi − Prive).
7. Neraca bentuk T (account form): Aktiva (Lancar + Tetap − Akm. Penyusutan) vs Pasiva (Kewajiban + Ekuitas); TOTAL AKTIVA = TOTAL PASIVA.
8. Neraca bentuk Staffel (report form, komparatif): AKTIVA (Lancar → Tetap) → TOTAL AKTIVA; PASIVA (Kewajiban → Ekuitas) → TOTAL PASIVA; kolom Perubahan = periode berjalan − sebelumnya.
9. Arus Kas langsung: Operasi (terima kas pelanggan − bayar gaji/sewa/utang) + Investasi (− beli peralatan, + jual aset) + Pendanaan (setoran modal − prive/dividen ± pinjaman) = Kenaikan Bersih Kas; Kas Awal → Kas Akhir.
10. Arus Kas tidak langsung: Laba sebelum pajak + penyusutan/amortisasi ± perubahan modal kerja (− kenaikan piutang, − kenaikan persediaan, + kenaikan utang) = Neto Operasi; lalu Investasi & Pendanaan.

Saldo normal akun UMKM: Aset (Kas, Piutang, Persediaan, Perlengkapan, Biaya dibayar dimuka, Aset tetap) = DEBET; Akumulasi Penyusutan/Amortisasi & Cadangan kerugian piutang = KREDIT; Kewajiban = KREDIT; Ekuitas = KREDIT; Pendapatan = KREDIT; Beban = DEBET.`,
  },
  {
    category: "Referensi Laporan",
    name: "format-laporan-publik",
    title: "Format Laporan Keuangan Perusahaan Publik (PSAK/IFRS — contoh Unilever 2025)",
    content: `Laporan keuangan perusahaan publik (bilingual, jutaan Rupiah, 2 periode komparatif, dengan Catatan atas Laporan Keuangan per pos).

LAPORAN POSISI KEUANGAN:
- Aset Lancar: kas & setara kas; piutang usaha (pihak ketiga/berelasi); uang muka & piutang lain; persediaan; beban dibayar di muka; pajak dibayar di muka; aset dimiliki untuk dijual.
- Aset Tidak Lancar: aset tetap; goodwill; aset takberwujud; aset hak-guna; klaim pajak.
- JUMLAH ASET.
- Liabilitas Jangka Pendek: pinjaman bank; utang usaha (pihak ketiga/berelasi); utang pajak (PPh badan, pajak lain); akrual; utang lain-lain; imbalan kerja jk. pendek; sewa jk. pendek.
- Liabilitas Jangka Panjang: pajak tangguhan; imbalan kerja jk. panjang; sewa jk. panjang.
- Ekuitas: modal saham (ditempatkan & disetor penuh); tambahan modal disetor; saham treasuri (−); saldo laba dicadangkan; saldo laba belum dicadangkan.
- JUMLAH LIABILITAS DAN EKUITAS = JUMLAH ASET.

LAPORAN LABA RUGI & PENGHASILAN KOMPREHENSIF LAIN:
- Operasi dilanjutkan: Penjualan bersih − HPP = Laba Bruto − Beban pemasaran & penjualan − Beban umum & administrasi − Beban lain = Laba Usaha ± Penghasilan/Biaya keuangan = Laba Sebelum Pajak − Beban pajak = Laba Operasi Dilanjutkan.
- Operasi dihentikan: laba + gain penjualan operasi dihentikan (setelah pajak).
- LABA; ± OCI (pengukuran kembali imbalan kerja + pajak terkait) = JUMLAH PENGHASILAN KOMPREHENSIF.
- Lampiran: EBITDA, EPS dasar (operasi dilanjutkan & total).

CONTOH ANGKA (PT Unilever Indonesia Tbk, 31 Des 2025, juta Rp):
- Total aset 20.017.339 = liabilitas 15.542.221 + ekuitas 4.475.118 (balance).
- Penjualan bersih 31.943.461; HPP 16.946.367 → Laba bruto 14.997.094.
- Laba usaha 4.592.021; laba sebelum pajak 4.498.280; pajak 960.983 → laba operasi dilanjutkan 3.537.297.
- + Operasi dihentikan 4.103.864 → Laba 7.641.161; OCI +67.152 → Total komprehensif 7.708.313.
- EBITDA operasi dilanjutkan 5.260.715; EPS dasar Rp93.

CHECKLIST VALIDASI LAPORAN:
1. Neraca saldo: total debit = total kredit.
2. Aset = Liabilitas + Ekuitas.
3. Penjualan bersih = Penjualan − Diskon − Retur.
4. HPP = Persediaan awal + Pembelian − Persediaan akhir.
5. Laba ditahan akhir = awal + laba bersih − dividen.
6. Kas akhir = Kas awal + neto operasi + neto investasi + neto pendanaan.
7. Akun riil hanya di Neraca; akun nominal hanya di Laba Rugi.
8. Komparatif: Perubahan = tahun berjalan − tahun lalu.`,
  },
  {
    category: "Referensi Laporan",
    name: "format-annual-report-narasi-dashboard",
    title: "Narasi & Dashboard Annual Report (adaptasi Unilever Indonesia 2025)",
    content: `Struktur annual report perusahaan publik (SEOJK 16/2021) — adaptasi PT Unilever Indonesia Tbk 2025.

URUTAN LAPORAN TAHUNAN:
1. Sangkalan & batasan tanggung jawab
2. Pendahuluan & ikhtisar: tema; profil; strategi; kinerja tahun berjalan; ikhtisar keuangan 5 tahun; ikhtisar saham per kuartal; aksi korporasi (buyback/split); obligasi
3. Laporan manajemen: Laporan Direksi (tinjauan makro, strategi, kinerja, prospek); profil direksi; Laporan Dewan Komisaris
4. Profil perusahaan: identitas, riwayat, visi-misi, kegiatan usaha, wilayah, struktur, pemegang saham, entitas anak, kronologi pencatatan, penghargaan, peristiwa penting
5. Penunjang bisnis: SDM, K3, digitalisasi & keamanan siber
6. Analisis & Pembahasan Manajemen (MD&A): tinjauan operasional per segmen; tinjauan keuangan (kinerja, likuiditas, solvabilitas, struktur modal, target vs realisasi, prospek, kebijakan dividen, pihak berelasi, kelangsungan usaha)
7. GCG: RUPS, dewan, komite audit/nominasi-remunerasi, audit internal & eksternal, manajemen risiko, pengendalian internal, kode etik, whistleblowing
8. CSR/keberlanjutan
9. Pernyataan tanggung jawab direksi & dewan komisaris
10. Laporan keuangan audited + catatan

DASHBOARD KPI EKSEKUTIF (halaman pertama):
- Penjualan bersih Rp31,9 T (+4,3% vs 30,6 T); Laba bersih Rp3,5 T (operasi dilanjutkan)
- GPM 46,9%; OPM 14,4%; ROA 19,6%; ROE 106,8%; EBITDA Rp5,26 T (margin 16,5%); EPS Rp93

IKHTISAR 5 TAHUN (miliar Rp, 2021-2025):
- Penjualan: 31.943 → 30.623 → 38.611 → 41.219 → 39.546
- Laba bruto 14.997; laba usaha 4.592; laba 7.641 (2025)
- Jumlah aset 20.017; liabilitas 15.542; ekuitas 4.475 (2025)

IKHTISAR SAHAM 2025 (per kuartal): harga penutupan 1.265/1.450/1.780/2.600; kapitalisasi pasar akhir Rp99,19 T; buyback maks Rp2 T (maks Rp1.700/saham, free float ≥7,5%)

KERANGKA NARASI LAPORAN DIREKSI:
1. Kalimat tema + pesan kunci
2. Tinjauan makro & industri (GDP, inflasi, suku bunga, dinamika kanal)
3. Strategi: 3 pilar Category (merek, portofolio, digital-first) / Channel (go-to-market, kanal masa depan) / Cost (margin, produktivitas)
4. Kinerja: penjualan +%, laba, margin, pangsa pasar, efisiensi
5. Prospek + penutup tanggung jawab

TEMPLATE NARASI UNTUK KLIEN (akuntan):
1. Ringkasan eksekutif (posisi + pesan kunci)
2. Konteks usaha/industri (2-3 kalimat)
3. Kinerja keuangan: penjualan & %, laba kotor/usaha/bersih + margin, penyebab perubahan (volume/harga/bauran/biaya)
4. Dashboard 4-6 KPI (penjualan, margin, laba, kas, piutang, utang) + komparasi + target
5. Posisi keuangan & rasio (likuiditas, solvabilitas)
6. Arus kas (operasi/investasi/pendanaan, kas akhir)
7. Risiko & mitigasi teratas
8. Prospek & rencana
9. Pernyataan tanggung jawab

CHECKLIST: setiap angka punya penjelasan penyebab; KPI konsisten dengan laporan keuangan; komparasi dengan periode lalu; sebut volume vs harga; margin per tingkat; dashboard ≤6 KPI; prospek sebut asumsi.`,
  },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const item of ITEMS) {
    const existing = await prisma.knowledgeItem.findFirst({
      where: { name: item.name, status: "ACTIVE" },
    });
    if (existing) {
      skipped += 1;
      console.log(`skip  ${item.name} (sudah ada: ${existing.title})`);
      continue;
    }
    await prisma.knowledgeItem.create({
      data: {
        category: item.category,
        name: item.name,
        title: item.title,
        content: item.content,
        version: 1,
        effectiveDate: new Date(),
        status: "ACTIVE",
        changeNote: "Seed dari referensi skill keuangan-akuntansi-indonesia/07 (2026-08-11)",
      },
    });
    created += 1;
    console.log(`create ${item.name} — ${item.title}`);
  }
  console.log(`Selesai: ${created} dibuat, ${skipped} dilewati.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
