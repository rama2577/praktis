# Format Laporan Keuangan & Neraca Lajur (referensi praktik)

> Sumber: dokumen acuan yang dimasukkan user (2026-08-11): (1) Worksheet akuntansi / neraca
> lajur contoh; (2) Template Laporan Keuangan Sederhana UMKM (12 sheet, PT BEE JAYA);
> (3) Annual Report PT Unilever Indonesia Tbk 2025 (laporan keuangan audited, dalam jutaan Rupiah).
> Gunakan file ini sebagai patokan FORMAT & STRUKTUR saat menyusun/validasi laporan keuangan,
> dan rujuk `05-sak-psak-indonesia.md` untuk dasar standarnya.

---

## 1. Neraca Lajur / Worksheet Akuntansi (kertas kerja 10 kolom)

Alat penyusun laporan keuangan: menggabungkan neraca saldo, jurnal penyesuaian, dan pemisahan
akun laba-rugi vs neraca dalam satu tabel.

Struktur kolom (berpasangan Debit/Kredit):

| # | Kolom | Isi |
|---|-------|-----|
| 1–2 | Kode Akun & Nama Akun | daftar semua akun COA |
| 3–4 | **Neraca Saldo** (D/K) | saldo dari buku besar sebelum penyesuaian |
| 5–6 | **Penyesuaian** (D/K) | jurnal penyesuaian (ajp) periode tsb |
| 7–8 | **Neraca Saldo Disesuaikan (NSD)** (D/K) | Neraca Saldo ± Penyesuaian |
| 9–10 | **Laba Rugi** (D/K) | pindahkan akun nominal (pendapatan & beban) |
| 11–12 | **Neraca** (D/K) | pindahkan akun riil (aset, liabilitas, ekuitas) |

Cara kerja:
1. Isi Neraca Saldo dari buku besar (contoh: Kas Rp800.000 D; Piutang dagang Rp450.000 D;
   Persediaan Rp345.000 D; Iklan dibayar di muka Rp18.000 D; Peralatan Rp80.000 D;
   Utang dagang Rp240.000 K; Modal Rp300.000 K).
2. Isi kolom Penyesuaian — contoh ajp: piutang bertambah Rp20.000 (D); persediaan akhir
   Rp300.000 (D) dengan koreksi persediaan awal Rp345.000 (K); iklan yang menjadi beban
   Rp10.000 (K).
3. NSD = Neraca Saldo ± Penyesuaian (mis. Iklan dibayar di muka 18.000 − 10.000 = 8.000).
4. Pindahkan akun nominal ke kolom Laba Rugi; akun riil ke kolom Neraca.
5. **Jumlah debit = jumlah kredit di setiap pasangan kolom**; selisih Laba Rugi (laba/rugi
   bersih) dipindah ke kolom Neraca (baris "Laba") sehingga Neraca ikut seimbang.
6. Baris akhir: Jumlah (total tiap pasangan), Laba (D/K), Jumlah Akhir.

---

## 2. Template laporan keuangan UMKM (alur siklus + 8 laporan)

Alur lengkap (sheet berurutan): **Jurnal Umum → Posting Buku Besar → Neraca Saldo →
Worksheet/Neraca Lajur → Laporan Laba Rugi → Laporan Perubahan Modal → Laporan Posisi
Keuangan (Neraca) → Laporan Arus Kas**.

### 2.1 Jurnal Umum
Kolom: Tanggal | Transaksi (keterangan + ref) | Debit | Kredit. Debit = kredit per transaksi.

### 2.2 Posting Buku Besar
Per akun: Tanggal | Keterangan | Debit | Kredit | **Saldo** (saldo berjalan per posting).

### 2.3 Neraca Saldo
Kolom: Kode Akun | Nama Akun | Debit (Rp) | Kredit (Rp) + baris TOTAL (debit = kredit).

### 2.4 Laporan Laba Rugi — bentuk sederhana (single step)
```
Pendapatan (Penjualan Barang Dagang + Penjualan Aset) = Jumlah Pendapatan
- HPP
= Laba Kotor
- Beban (Gaji, Listrik, Lainnya) = Total Beban
= Laba Bersih Sebelum Pajak
- Pajak
= Laba/Rugi Bersih
```

### 2.5 Laporan Laba Rugi — bentuk bertahap (multiple step)
```
Penjualan
- Diskon Penjualan
- Retur Penjualan
= Penjualan Bersih
- HPP  (Persediaan Awal + Pembelian − Persediaan Akhir = Barang Tersedia − Persediaan Akhir)
= Laba Kotor
- Beban Usaha: Beban Operasional (gaji, promosi, ongkir) + Beban Administrasi (gaji admin, sewa, asuransi)
= Laba Operasi
± Pendapatan/Beban Lain (bunga, sewa, beban bunga)
= Laba Bersih Sebelum Pajak
- Pajak
= Laba/Rugi Bersih
```

### 2.6 Laporan Perubahan Modal
```
Modal Awal
+ Laba Bersih (jika untung)
- Prive (jika ada)
= Modal Akhir
```
Catatan template: jika rugi, "Laba Bersih" menjadi pengurang (Modal Awal − Rugi − Prive).

### 2.7 Laporan Posisi Keuangan — bentuk T (account form)
Sisi kiri **AKTIVA** vs sisi kanan **PASIVA**:
- Aktiva: Aktiva Lancar (Kas & setara kas, Piutang usaha, Biaya dibayar di muka, Aset lancar
  lain) → TOTAL; Aktiva Tetap (Peralatan, Inventaris, − Akumulasi Penyusutan) → TOTAL.
- Pasiva: Kewajiban (Utang usaha, beban sewa perlu dibayar, utang pajak, kewajiban lancar
  lain) → TOTAL; Ekuitas (Modal pemilik, Prive, Laba ditahan) → TOTAL.
- **TOTAL AKTIVA = TOTAL PASIVA + EKUITAS** (prinsip harus balance).

### 2.8 Laporan Posisi Keuangan — bentuk staffel (report form) + komparatif
Berurutan ke bawah, biasanya komparatif 2 periode dengan kolom **Perubahan**:
```
AKTIVA
  Aktiva Lancar (Kas, Persediaan, Piutang Usaha) → Tot. Aktiva Lancar
  Aktiva Tetap (Peralatan, − Akm. Penyusutan) → Tot. Aktiva Tetap
TOTAL AKTIVA
PASIVA
  Kewajiban (Utang Dagang, Utang Bank) → Tot. Kewajiban
  Ekuitas (Modal, Laba Ditahan, − Dividen) → Tot. Ekuitas
TOTAL PASIVA
```
Kolom Perubahan = periode berjalan − periode sebelumnya (+/−).

### 2.9 Laporan Arus Kas — metode langsung (direct)
```
Arus Kas dari Aktivitas Operasi: penerimaan kas dari pelanggan; − pembayaran gaji, sewa, utang dagang
Arus Kas dari Aktivitas Investasi: − pembelian peralatan; hasil penjualan aset
Arus Kas dari Aktivitas Pendanaan: setoran modal; − prive/dividen; penerimaan/pembayaran pinjaman
= Kenaikan/Penurunan Bersih Kas
+ Kas Awal = Kas Akhir
```

### 2.10 Laporan Arus Kas — metode tidak langsung (indirect)
```
Laba sebelum pajak
+ Penyesuaian non-kas: penyusutan, amortisasi
± Perubahan modal kerja: − kenaikan piutang, − kenaikan persediaan, + kenaikan utang usaha, dll.
= Arus Kas Neto dari Aktivitas Operasi
Arus Kas dari Aktivitas Investasi (pembelian/penjualan aset tetap)
Arus Kas dari Aktivitas Pendanaan (pinjaman, dividen)
= Kenaikan Bersih Kas; Kas Awal → Kas Akhir
```

### 2.11 Daftar akun (COA) UMKM — saldo normal
Contoh klasifikasi dari template: Aset Lancar (Kas, Surat berharga, Piutang usaha,
Cadangan kerugian piutang **Kredit**, Wesel tagih, Piutang karyawan, Perlengkapan,
Persediaan, Biaya dibayar di muka) → **Debet**; Aset Tetap Berwujud (Tanah, Bangunan,
Kendaraan, Mesin, Peralatan) → **Debet**, Akumulasi Penyusutan → **Kredit**; Aset Tak
Berwujud (Hak paten, Goodwill, Hak cipta, Merek, Lisensi) → **Debet**, Akm. Amortisasi →
**Kredit**; Kewajiban → **Kredit**; Ekuitas → **Kredit**; Pendapatan → **Kredit**;
Beban → **Debet**.

---

## 3. Format laporan keuangan perusahaan publik (PSAK/IFRS — contoh Unilever 2025)

Disusun bilingual (Indonesia–Inggris), dalam jutaan Rupiah, 2 periode komparatif (2025 vs 2024),
lengkap dengan **Catatan atas Laporan Keuangan** (notes) yang dirujuk per pos.

### 3.1 Laporan Posisi Keuangan (Statement of Financial Position)
```
ASET
  Aset Lancar: Kas & setara kas; Piutang usaha (pihak ketiga/berelasi); Uang muka & piutang
               lain; Persediaan; Beban dibayar di muka; Pajak dibayar di muka; Aset dimiliki
               untuk dijual → Jumlah Aset Lancar
  Aset Tidak Lancar: Aset tetap; Goodwill; Aset takberwujud; Aset hak-guna; Klaim pajak;
                     Aset tidak lancar lainnya → Jumlah Aset Tidak Lancar
JUMLAH ASET
LIABILITAS
  Liabilitas Jangka Pendek: Pinjaman bank; Utang usaha (pihak ketiga/berelasi); Utang pajak
        (PPh badan, pajak lain); Akrual; Utang lain-lain; Imbalan kerja jk. pendek; Sewa jk. pendek
  Liabilitas Jangka Panjang: Pajak tangguhan; Imbalan kerja jk. panjang; Sewa jk. panjang
JUMLAH LIABILITAS
EKUITAS: Modal saham (ditempatkan & disetor penuh); Tambahan modal disetor; Saham treasuri (−);
         Saldo laba dicadangkan; Saldo laba belum dicadangkan
JUMLAH EKUITAS
JUMLAH LIABILITAS DAN EKUITAS   (= JUMLAH ASET)
```

### 3.2 Laporan Laba Rugi dan Penghasilan Komprehensif Lain
```
OPERASI YANG DILANJUTKAN
  Penjualan bersih
  − Harga pokok penjualan
  = Laba Bruto
  − Beban pemasaran & penjualan; − Beban umum & administrasi; − Beban lain, neto
  = Laba Usaha (Operating Profit)
  + Penghasilan keuangan; − Biaya keuangan
  = Laba Sebelum Pajak Penghasilan
  − Beban pajak penghasilan
  = Laba dari Operasi yang Dilanjutkan
OPERASI YANG DIHENTIKAN
  ± Laba dari operasi dihentikan; ± Laba penjualan operasi dihentikan
  = Jumlah laba operasi dihentikan setelah pajak
LABA
± Penghasilan komprehensif lain (OCI): pengukuran kembali imbalan kerja, pajak terkait
= JUMLAH PENGHASILAN KOMPREHENSIF
Lampiran: EBITDA (operasi dilanjutkan); Laba per saham dasar (EPS) — operasi dilanjutkan & total
```

### 3.3 Laporan Perubahan Ekuitas & Arus Kas
- Perubahan Ekuitas: saldo awal per komponen ekuitas → laba komprehensif → transaksi dengan
  pemilik (dividen, saham treasuri) → saldo akhir.
- Arus Kas (umumnya **tidak langsung** untuk operasi): laba sebelum pajak → penyesuaian
  non-kas & perubahan modal kerja → operasi; investasi (CAPEX, akuisisi); pendanaan
  (dividen, pinjaman, treasuri).

### 3.4 Contoh angka (PT Unilever Indonesia Tbk, 31 Des 2025, juta Rp)
- Total aset **20.017.339** = liabilitas 15.542.221 + ekuitas 4.475.118 (balance)
- Penjualan bersih 31.943.461; HPP 16.946.367 → Laba bruto 14.997.094
- Beban pemasaran 7.396.945 + beban umum 2.963.445 → Laba usaha 4.592.021
- Laba sebelum pajak 4.498.280; pajak 960.983 → Laba operasi dilanjutkan 3.537.297
- + Operasi dihentikan 4.103.864 (termasuk gain penjualan 3.794.404) → **Laba 7.641.161**
- OCI neto +67.152 → Jumlah penghasilan komprehensif 7.708.313
- EBITDA operasi dilanjutkan 5.260.715; EPS dasar operasi dilanjutkan Rp93 (nilai penuh)

---

## 4. Cek-cek cepat validasi laporan (checklist)

1. **Neraca saldo seimbang**: total debit = total kredit.
2. **Persamaan akuntansi**: Aset = Liabilitas + Ekuitas.
3. **Penjualan bersih** = Penjualan − Diskon − Retur.
4. **HPP** = Persediaan awal + Pembelian (bersih) − Persediaan akhir.
5. **Laba ditahan akhir** = Laba ditahan awal + Laba bersih − Dividen.
6. **Arus kas**: Kas akhir = Kas awal + neto operasi + neto investasi + neto pendanaan.
7. Akun riil hanya di Neraca; akun nominal hanya di Laba Rugi (kecuali pemindahan laba).
8. Laporan komparatif: kolom Perubahan = tahun berjalan − tahun lalu.
