/**
 * KB Seed — Riset Model Bisnis → COA & Accounting Treatment (18 industri).
 * Ringkasan per industri: akun COA khas, treatment, standar (PSAK/ISAK), implikasi pajak.
 * Detail lengkap: docs/riset-model-bisnis-coa.md.
 *
 * Idempotent: skip jika name sudah ada.
 * Jalankan: npx tsx scripts/seed-kb-model-bisnis.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ITEMS: { name: string; category: string; title: string; content: string }[] = [
  {
    name: "coa-manufaktur",
    category: "Chart of Accounts (COA)",
    title: "COA & Treatment Manufaktur — persediaan 3 tahap, HPP, overhead pabrik",
    content: `# Manufaktur — Dampak COA & Treatment
Akun khas: Persediaan Bahan Baku, Persediaan WIP, Persediaan Barang Jadi, Biaya Overhead Pabrik (listrik, penyusutan mesin, gaji supervisor), HPP, Beban Pengiriman.
Treatment: HPP = persediaan awal + pembelian + biaya produksi − persediaan akhir; alokasi overhead pabrik (tarif normal/aktual); PSAK 14 (persediaan); biaya pinjaman untuk aset kualifikasian (PSAK 26).
Pajak: PPh 22 impor bahan baku; PPN normal; stok opname periodik.
Jurnal khas: Db Persediaan WIP / Kr Bahan Baku (pemakaian); Db HPP / Kr Persediaan Barang Jadi (penjualan).`,
  },
  {
    name: "coa-konstruksi-psak72",
    category: "Chart of Accounts (COA)",
    title: "COA & Treatment Konstruksi/Developer — PSAK 72 termin, retensi, uang muka",
    content: `# Konstruksi & Developer — Dampak COA & Treatment
Akun khas: Piutang Termin (progress billing), Uang Muka Kontraktor, Retensi, Pendapatan Kontrak, Biaya Konstruksi, Tanah/Bangunan dalam Proses.
Treatment: PSAK 72 — pendapatan diakui sepanjang waktu (metode input cost-to-cost) atau titik waktu (serah terima); uang muka = contract liability; PSAK 73 untuk sewa alat berat. Retensi = piutang yang ditahan sampai pemeliharaan selesai.
Pajak: PPh Final jasa konstruksi 2%/2,65% (PP 9/2022) atau 1,75% (kualifikasi kecil); PPN konstruksi; developer: penjualan rumah sesuai progres PSAK 72.
Jurnal khas: Db Piutang Termin / Kr Pendapatan Kontrak; Db Kas / Kr Piutang Termin; Db Retensi / Kr Piutang Termin.`,
  },
  {
    name: "coa-koperasi-shu",
    category: "Chart of Accounts (COA)",
    title: "COA & Treatment Koperasi — simpanan, SHU, pinjaman anggota",
    content: `# Koperasi — Dampak COA & Treatment
Akun khas: Simpanan Pokok, Simpanan Wajib, Simpanan Sukarela, SHU Tahun Berjalan, Piutang Anggota (pinjaman), Pendapatan Jasa, Beban Bunga/Jasa.
Treatment: simpanan pokok & wajib = ekuitas; simpanan sukarela = liabilitas (dapat ditarik); SHU = laba koperasi yang dibagi setelah RAT (bukan dividen saham); PSAK 72 untuk pendapatan jasa; dasar hukum UU 25/1992, PP 7/2021.
Pajak: bagian SHU dari transaksi dengan anggota = bukan objek pajak (Pasal 4(3)(i) UU PPh) bagi koperasi primer beranggotakan UMKM; sisa dari non-anggota kena pajak normal.
Jurnal khas: Db Kas / Kr Simpanan Wajib; Db Kas / Kr Piutang Anggota (pelunasan); Db SHU / Kr Kas (pembagian).`,
  },
  {
    name: "coa-escrow-dana-pihak-ketiga",
    category: "Chart of Accounts (COA)",
    title: "COA & Treatment Escrow / Dana Pihak Ketiga — e-commerce, fintech, marketplace",
    content: `# E-commerce & Fintech — Dana Titipan/Escrow
Akun khas: Rekening Escrow (kas dibatasi), Piutang Marketplace, Dana Nasabah/Pendana (liabilitas), Pendapatan Komisi, Beban Marketplace Fee, Retur Penjualan.
Treatment: escrow & dana nasabah = LIABILITAS, bukan pendapatan — jangan diklasifikasi sebagai kas bebas; pendapatan platform = komisi (net) jika principal vs agent sesuai PSAK 72; CKPN (PSAK 71) untuk piutang pembiayaan; retur mengurangkan pendapatan.
Pajak: PPN PMSE (platform luar negeri); PPh 22 e-commerce dipungut atas penjualan tertentu di platform (PMK 74/2024); PPh 23 bunga untuk pendanaan.
Jurnal khas: Db Kas Escrow / Kr Dana Nasabah; Db Dana Nasabah / Kr Kas (pencairan); Db Kas Escrow / Kr Pendapatan Komisi + Kr Dana Nasabah (net).`,
  },
  {
    name: "treatment-nirlaba-isak35",
    category: "Referensi PSAK",
    title: "Treatment Nirlaba (ISAK 35) & Pendidikan — dana terikat, uang pangkal",
    content: `# Yayasan/Nirlaba & Pendidikan — Treatment
Akun khas: Dana Terikat Temporer/Permanen, Hibah & Donasi, Beban Program, Beban Administrasi, Aset Dana Abadi, Uang Pangkal (deferred), Piutang SPP.
Treatment: ISAK 35 — penyajian aset bersih tanpa/terikat; hibah tanpa kewajiban balas jasa diakui saat diterima; dana abadi = terikat permanen. Uang pangkal diakui selama masa studi (deferred revenue), SPP per bulan ajaran.
Pajak: yayasan bidang sosial/keagamaan/pendidikan — sisa lebih yang ditanamkan kembali = bukan objek pajak (PMK 68/2020); nirlaba pendidikan: penghasilan dari kegiatan pendidikan = bukan objek (Pasal 4(3)(o) UU HPP) dengan syarat; PPh 21 karyawan tetap wajib.
Jurnal khas: Db Kas / Kr Dana Terikat; Db Kas / Kr Pendapatan Diterima di Muka (uang pangkal); Db Pendapatan Diterima di Muka / Kr Pendapatan (amortisasi).`,
  },
  {
    name: "treatment-agrikultur-psak69",
    category: "Referensi PSAK",
    title: "Treatment Agrikultur (PSAK 69) — aset biologis, nilai wajar, panen",
    content: `# Agrikultur — Treatment (PSAK 69)
Akun khas: Aset Biologis (tanaman menghasilkan/belum menghasilkan, ternak), Biaya Budidaya, Pendapatan Hasil Panen, Beban Pupuk/Pakan.
Treatment: aset biologis diukur pada nilai wajar dikurangi biaya menjual (atau biaya perolehan bila nilai wajar tidak andal); perubahan nilai wajar → laba rugi periode berjalan; hasil panen = persediaan (PSAK 14).
Pajak: PPh Final 0,5% UMKM (PP 55/2022); PBB perkebunan/perikanan (daerah).
Jurnal khas: Db Aset Biologis / Kr Keuntungan Perubahan Nilai Wajar; Db Persediaan / Kr Aset Biologis (panen).`,
  },
  {
    name: "treatment-properti-sewa-psak73",
    category: "Referensi PSAK",
    title: "Treatment Sewa & Properti (PSAK 73/65) — lessor, deposit, sewa gedung",
    content: `# Sewa & Properti — Treatment (PSAK 73/65)
Akun khas: Properti Investasi, Pendapatan Sewa, Deposit Sewa (liabilitas), Uang Muka Sewa, Beban Perawatan Gedung, Aset Hak Guna (lessee).
Treatment: lessor operating lease: pendapatan sewa garis lurus selama masa sewa; deposit sebagai liabilitas sampai pengembalian; lessee: aset hak guna + liabilitas sewa (PSAK 73) — penting untuk restoran/kantor sewa; properti investasi (PSAK 65): cost model atau revaluasi.
Pajak: PPh Final 10% sewa tanah/bangunan (Pasal 4(2)); PPN 11% atas sewa bila PKP; PBB.
Jurnal khas (lessor): Db Kas / Kr Deposit Sewa; Db Kas / Kr Pendapatan Sewa (bulanan, garis lurus).`,
  },
  {
    name: "treatment-kesehatan-piutang-bpjs",
    category: "Referensi PSAK",
    title: "Treatment Klinik/Kesehatan — piutang BPJS, bagi hasil dokter, alat medis",
    content: `# Kesehatan (Klinik/Lab) — Treatment
Akun khas: Piutang BPJS/Asuransi, Pendapatan Jasa Medis, Beban Obat & Alkes, Alat Medis (disusutkan), Beban Dokter Spesialis, Uang Muka Pasien.
Treatment: klaim BPJS diakui sebagai piutang saat diajukan, dengan cadangan koreksi klaim; bagi hasil dokter = beban (bukan pembagian laba); alat medis disusutkan 4 tahun; paket MCU = PSAK 72 multi-elemen.
Pajak: PPh 21 dokter (bukan pegawai, 50% norma); PPN jasa kesehatan tertentu dibebaskan (UU HPP); PPh 23/26 dokter asing.
Jurnal khas: Db Piutang BPJS / Kr Pendapatan Jasa Medis; Db Kas / Kr Piutang BPJS (pencairan klaim); Db Beban Dokter / Kr Kas.`,
  },
  {
    name: "treatment-transportasi-logistik",
    category: "Referensi PSAK",
    title: "Treatment Transportasi & Logistik — armada, COD, dana titipan kurir",
    content: `# Transportasi & Logistik — Treatment
Akun khas: Pendapatan Pengiriman, Beban BBM/Tol, Beban Perawatan Armada, Aset Kendaraan + Akumulasi, Piutang COD, Hutang Penagih.
Treatment: penyusutan kendaraan 8 tahun (mesin 4-8 th); pendapatan diakui saat layanan selesai (PSAK 72); dana titipan COD = liabilitas sampai disetor ke penjual.
Pajak: PPh Final 0,5% UMKM atau normal; PPN jasa angkutan umum = dibebaskan (PMK 80/2025, PMK 15/2025); PKB (daerah).
Jurnal khas: Db Kas (COD) / Kr Hutang Penagih; Db Hutang Penagih / Kr Kas (setoran ke penjual).`,
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
      console.log(`  ↪ skip ${it.name}`);
      skipped++;
      continue;
    }
    await prisma.knowledgeItem.create({
      data: {
        category: it.category,
        name: it.name,
        title: it.title,
        content: it.content,
        version: 1,
        effectiveDate: now,
        status: "ACTIVE",
        changeNote: "Seed riset model bisnis → COA & treatment (2026-08-13)",
      },
    });
    console.log(`  ✅ ${it.name}`);
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
