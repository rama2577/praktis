# Riset: Model Bisnis → Dampak COA & Accounting Treatment

> Untuk Praktis (LedgerLine) — platform AI bookkeeping firma akuntansi Indonesia.
> Tanggal riset: 2026-08-13. Fokus: model bisnis UKM Indonesia yang berdampak
> signifikan pada struktur COA dan perlakuan akuntansi, agar template COA & engine
> jurnal tidak terbatas pada service/FnB/trading.

---

## Ringkasan Eksekutif

Praktis saat ini mengenal 3 industri (RETAIL, SERVICES, FNB) dengan COA standar tunggal.
Riset ini memetakan **18 model bisnis** yang umum menjadi klien firma akuntansi Indonesia,
masing-masing dengan: akun COA khas, jurnal/perlakuan khusus, standar acuan, dan implikasi pajak.
Output: template COA per industri, aturan engine (auto-post/validasi), dan bahan knowledge base AI.

**Temuan kunci — 5 akun/transaksi "pembeda" yang sering menimbulkan salah kategorisasi:**
1. **Uang muka vs pendapatan ditangguhkan** (deferred revenue) — jasa/event/kontrak
2. **Persediaan bertingkat** (bahan baku → WIP → barang jadi) — manufaktur vs dagang
3. **Pendapatan termin/kontrak** (PSAK 72, metode input) — konstruksi
4. **Dana pihak ketiga / escrow** (dana nasabah, titipan, escrow marketplace) — kewajiban, bukan kas
5. **Aset biologis & deplesi** — agrikultur & tambang

---

## 1. Manufaktur (pabrik)
- **COA khas**: Persediaan Bahan Baku, Persediaan WIP, Persediaan Barang Jadi, Biaya Overhead Pabrik (listrik, penyusutan mesin, gaji supervisor), HPP, Beban Pengiriman.
- **Treatment**: HPP = persediaan awal + pembelian + biaya produksi − persediaan akhir; alokasi overhead (tarif normal/aktual); PSAK 14 (persediaan), biaya pinjaman (PSAK 26) untuk aset kualifikasian.
- **Pajak**: PPh 22 impor bahan baku; PPN normal; pencatatan stok opname.

## 2. Konstruksi & Developer Properti
- **COA khas**: Piutang Termin (progress billing), Uang Muka Kontraktor, Retensi, Pendapatan Kontrak (LRA), Biaya Konstruksi, Tanah dalam Pengembangan, Bangunan dalam Proses.
- **Treatment**: **PSAK 72** — pengakuan pendapatan sepanjang waktu (metode input: cost-to-cost) atau titik waktu (serah terima); kewajiban kontrak (contract liability) untuk uang muka; PSAK 73 untuk sewa alat berat.
- **Pajak**: PPh Final 2%/2,65% jasa konstruksi (PP 9/2022, klasifikasi usaha), PPN konstruksi; developer: pengakuan penjualan rumah sesuai PSAK 72 (bukan 100% di akad).

## 3. Perdagangan / Trading & Distributor
- **COA khas**: Persediaan Barang Dagang, Retur Penjualan/Pembelian, Potongan/diskon, Piutang Dagang + aging, Hutang Dagang, Beban Angkut, Konsinyasi.
- **Treatment**: PSAK 14; diskon & retur sebagai pengurang pendapatan (bukan beban); konsinyasi: barang titipan TIDAK diakui sebagai persediaan; pencadangan piutang (PSAK 71 CKPN).
- **Pajak**: PPh 22 pembelian pemerintah/BUMN; PPN; distributor resmi vs tidak.

## 4. F&B — Restoran, Kafe, Katering
- **COA khas**: Kas kecil dapur, Persediaan Bahan Baku Masakan, Beban Makanan/Minuman (COGS), Peralatan Dapur (disusutkan 4-8 th), Uang Muka Langganan, Beban Lisensi Halal/PIRT.
- **Treatment**: HPP harian/periodik (metode periodik umum di UKM); penyusutan peralatan; kontrak sewa lokasi (PSAK 73 lessee).
- **Pajak**: PPh Final 0,5% (PP 55/2022) bagi UMKM; PPN 11% bila sudah PKP; pajak daerah (PB1) untuk restoran.

## 5. Hotel, Villa & Pariwisata
- **COA khas**: Pendapatan Kamar, Pendapatan F&B, Pendapatan Sewa Ruang (MICE), Deposit Tamu (liabilitas), Uang Muka Booking, Beban Laundry, Komisi Travel Agent.
- **Treatment**: deposit & uang muka sebagai liabilitas sampai check-out; pendapatan kamar diakui saat menginap; PSAK 72 untuk paket wisata multi-elemen (alokasi harga transaksi).
- **Pajak**: Pajak Hotel & Restoran (PHTL, daerah); PPh Final 0,5% UMKM atau normal.

## 6. Transportasi & Logistik (ekspedisi, kurir, armada)
- **COA khas**: Pendapatan Pengiriman, Beban BBM/Tol, Beban Perawatan Armada, Asuransi Armada, Aset Kendaraan + Akumulasi, Piutang COD, Hutang Penagih.
- **Treatment**: penyusutan kendaraan (8 th) & mesin; pendapatan diakui saat layanan selesai (PSAK 72); dana titipan COD sebagai liabilitas.
- **Pajak**: PPh 23 atas jasa pengangkutan? (tidak — masuk PPh final 0,5% atau normal); PPN jasa angkutan umum = dibebaskan (PMK 80/PMK 15 2025); pajak kendaraan (PKB, daerah).

## 7. Kesehatan — Klinik, Laboratorium, Klinik Gigi
- **COA khas**: Piutang BPJS/Asuransi (progress klaim), Pendapatan Jasa Medis, Beban Obat & Alkes, Alat Medis (disusutkan 4 th), Beban Dokter Spesialis (bagi hasil), Uang Muka Pasien.
- **Treatment**: klaim BPJS diakui saat diajukan (piutang) dengan cadangan koreksi; bagi hasil dokter sebagai beban; PSAK 72 untuk paket MCU.
- **Pajak**: PPh 21 dokter (bukan pegawai); PPN jasa kesehatan tertentu dibebaskan (PMK 49/2022 → UU HPP); PPh 23/26 dokter asing.

## 8. Pendidikan — Sekolah, Bimbel, Kursus, Kampus
- **COA khas**: Uang Pangkal (deferred), Uang SPP, Pendapatan Kursus, Piutang SPP, Dana BOP/Subsidi, Beban Gaji Guru, Beban Operasional Sekolah.
- **Treatment**: uang pangkal/gedung diakui selama masa studi (bukan cash basis); SPP diakui per bulan ajaran; ISAK 35/PSAK 45 untuk yayasan nirlaba.
- **Pajak**: badan nirlaba bidang pendidikan: penghasilan dari kegiatan pendidikan = bukan objek (UU HPP Pasal 4 ayat 3 huruf o) dengan syarat tertentu.

## 9. Koperasi
- **COA khas**: Simpanan Pokok, Simpanan Wajib, Simpanan Sukarela (ekuitas/liabilitas sesuai sifat), SHU Tahun Berjalan, Piutang Anggota (pinjaman), Beban Bunga/Jasa Pinjaman, Pendapatan Jasa.
- **Treatment**: simpanan pokok/wajib = ekuitas; simpanan sukarela bisa liabilitas; SHU = laba koperasi yang dibagi setelah RAT; PSAK 72 untuk jasa; pengaturan khusus (UU 25/1992, PP 7/2021).
- **Pajak**: koperasi primer yang beranggotakan UMKM — bagian SHU dari transaksi anggota = bukan objek pajak (Pasal 4(3)(i) UU PPh); sisa dari non-anggota kena pajak normal.

## 10. Yayasan / Organisasi Nirlaba
- **COA khas**: Dana Terikat Temporer/Permanen, Hibah & Donasi, Beban Program, Beban Administrasi, Aset Dana Abadi.
- **Treatment**: **ISAK 35** (pelaporan nirlaba: aset bersih tanpa/terikat); hibah diakui saat diterima (tanpa kewajiban balas jasa); dana abadi = terikat permanen.
- **Pajak**: yayasan bidang sosial/keagamaan/pendidikan — bukan objek pajak untuk sisa lebih yang ditanamkan kembali (PMK 68/2020); PPh 21 karyawan tetap wajib.

## 11. Agrikultur — Perkebunan, Peternakan, Perikanan
- **COA khas**: Aset Biologis (tanaman menghasilkan/belum menghasilkan, ternak), Biaya Budidaya, Panen, Pendapatan Hasil Panen, Beban Pupuk/Pakan.
- **Treatment**: **PSAK 69** — aset biologis diukur pada nilai wajar dikurangi biaya menjual (atau biaya perolehan jika nilai wajar tak andal); perubahan nilai wajar → laba rugi.
- **Pajak**: PPh Final 0,5% UMKM; PBB perkebunan/perikanan (daerah).

## 12. Pertambangan & Penggalian (skala kecil)
- **COA khas**: Biaya Eksplorasi & Evaluasi (PSAK 64/IFRS 6), Biaya Pengupasan Tanah, Aset Tambang + Deplesi, Royalti, Pendapatan Penjualan Bijih.
- **Treatment**: eksplorasi: kebijakan cost model/impairment; deplesi berdasarkan unit produksi; kewajiban restorasi (provisi, PSAK 57).
- **Pajak**: royalti ke negara; PPh final 0,5% khusus WP tertentu (PMK 12/2024 dsb); PPN hasil tambang = dibebaskan (UU HPP 7/2021 Pasal 4A).

## 13. Fintech — P2P Lending, Pembiayaan, Koperasi Digital
- **COA khas**: Piutang Pembiayaan, CKPN (cadangan kerugian penurunan nilai), Dana Nasabah/Pendana (liabilitas), Pendapatan Bagi Hasil/Bunga, Beban Pendanaan, Rekening Escrow.
- **Treatment**: **PSAK 71** (CKPN ekspektasi kerugian kredit/ECL), **PSAK 72** untuk fee; dana pendana = liabilitas, bukan pendapatan; escrow diungkap terpisah.
- **Pajak**: PPh 23 atas bunga; PPN jasa keuangan = dibebaskan (Pasal 4A UU HPP); OJK compliance.

## 14. E-commerce & Marketplace (penjual online, platform)
- **COA khas**: Rekening Escrow (Marketplace), Pendapatan Komisi, Pendapatan Penjualan Barang, Beban Marketplace Fee, Beban Iklan/Ads, Beban Pengiriman, Retur.
- **Treatment**: penjual: escrow = kas dibatasi + piutang sampai cair; marketplace: pendapatan = komisi (net) atau bruto (principal vs agent — PSAK 72); retur → pengurang pendapatan.
- **Pajak**: pemungutan PPN PMSE (platform luar negeri); PPh 22 e-commerce dalam negeri (PMK 74/2024 untuk penjual di platform — dipungut 0,5% atas penjualan tertentu); PPh 21/26 PMSE.

## 15. Event Management, Agency & Jasa Kreatif
- **COA khas**: Uang Muka Klien (liabilitas), Biaya Pra-Produksi (WIP), Pendapatan Event, Beban Produksi (venue, artis, logistik), Komisi Agency, Retensi.
- **Treatment**: **PSAK 72** — event multi-elemen (tiket, sponsorship, F&B) alokasi harga transaksi; biaya pra-produksi sebagai aset bila memenuhi syarat (incremental cost); uang muka = contract liability sampai event.
- **Pajak**: PPh 23 atas jasa event organizer (2%); PPN; PPh 21 artis/pekerja lepas. (Contoh nyata: ARYA USAHA TIRTA, CV — kertas kerja ASC_2026.)

## 16. Waralaba / Franchise
- **COA khas**: Pendapatan Franchise Fee, Pendapatan Royalti, Piutang Royalti, Beban Royalty Out, Beban Marketing Fund.
- **Treatment**: initial franchise fee diakui sesuai pola transfer barang/jasa (PSAK 72 — sering bertahap, bukan sekaligus); royalti diakui saat terjadinya penjualan franchisee; marketing fund = liabilitas (dana titipan).
- **Pajak**: PPh 23 royalti (15% atau treaty); PPN atas royalti.

## 17. Properti Investasi & Sewa (lessor UKM)
- **COA khas**: Properti Investasi (nilai wajar/biaya), Pendapatan Sewa, Beban Perawatan Gedung, Uang Muka Sewa, Deposit Sewa.
- **Treatment**: **PSAK 65/PSAK 73** — lessor operating lease: pendapatan sewa garis lurus; deposit sebagai liabilitas; properti investasi (PSAK 65): cost model + revaluasi opsional (bukan untuk UKM ETAP).
- **Pajak**: PPh Final 10% sewa tanah/bangunan (Pasal 4(2)); PPN 11% (bila PKP) atas sewa.

## 18. Jasa Profesional — Konsultan, Advokat, Akuntan, Arsitek
- **COA khas**: Retainer Fee, Pendapatan Proyek, WIP (biaya proyek belum ditagih), Piutang Klien, Beban Subkontraktor, Beban Lisensi Profesi.
- **Treatment**: pendapatan jasa berdasarkan progres (PSAK 72, metode output: jam/aktivitas); retainer bisa pendapatan di muka; WIP = aset bila cost akan ditagih.
- **Pajak**: PPh 21 atas pegawai profesional; PPh 23 atas jasa (2%); PPN.

---

## Matriks Prioritas Implementasi di Praktis

| Prioritas | Model Bisnis | Alasan | Komponen Praktis |
|---|---|---|---|
| P0 | Konstruksi (PSAK 72) | Volume klien firma besar; paling sering salah catat | Template COA + engine termin/kontrak |
| P0 | Manufaktur | COA 3-tahap persediaan; HPP kompleks | Template COA + validasi HPP |
| P0 | Event/Agency | Klien nyata (ASC_2026); uang muka & WIP | Template COA + aturan uang muka |
| P1 | Koperasi | Segmen UKM terorganisir; simpanan & SHU unik | Template COA + jurnal SHU |
| P1 | E-commerce/Fintech | Escrow & dana pihak ketiga | Template COA + validasi liabilitas titipan |
| P1 | Kesehatan/Pendidikan | Piutang BPJS & uang pangkal deferred | Template COA + jurnal deferred |
| P2 | Nirlaba (ISAK 35), Agrikultur (PSAK 69), Tambang, Hotel, Transport | Spesialisasi | Template COA per industri |

## Keputusan yang Direkomendasikan
1. **Perluas enum Industry** → MANUFACTURING, CONSTRUCTION, PROPERTY, HOSPITALITY, HEALTHCARE, EDUCATION, COOPERATIVE, NONPROFIT, AGRICULTURE, TRANSPORT, TECHNOLOGY, FINANCE, EVENT, OTHER (tetap backward-compatible: RETAIL/SERVICES/FNB).
2. **COA template per industri** → seed `ChartTemplate` (COA lengkap + akun khas) yang dipakai saat pembuatan klien baru & dipakai AI saat mapping dokumen.
3. **Aturan engine per industri** → auto-post jurnal khas (termin konstruksi, SHU koperasi, deferred uang pangkal) & validasi spesifik (HPP manufaktur, escrow e-commerce).
4. **Knowledge base** → seed ringkasan tiap industri (lihat `scripts/seed-kb-model-bisnis.ts`).
