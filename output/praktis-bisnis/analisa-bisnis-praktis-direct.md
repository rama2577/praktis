# Analisa Bisnis — Praktis (Versi Direct-to-Market)
**AI Bookkeeping: dari PDF, foto, spreadsheet, CSV → draft jurnal & laporan keuangan**

*Disusun: 14 Agustus 2026 · Semua angka adalah estimasi berdasarkan riset yang tercantum, bukan janji.*

---

## 1. Ringkasan Eksekutif

Praktis saat ini sudah LIVE untuk firma akuntansi (KAP). Analisa ini mengevaluasi **jalur kedua: menjual langsung ke tim finance perusahaan** (model seperti rekeningkoran.com tapi dengan value chain lebih panjang — sampai jurnal & laporan).

**Kesimpulan utama:**
- Modal awal yang dibutuhkan kecil (Rp 15–40 jt) karena produk sudah jadi — investasi dominan di marketing & pengembangan fitur direct-market
- Revenue potensial 12 bulan: **Rp 100 jt – 1,8 M** tergantung skenario
- Break-even diperkirakan bulan ke-6 s/d ke-9 (skenario moderat)
- Risiko terbesar bukan teknis — tapi **CAC vs ARPU** dan **positioning di antara rekeningkoran.com (murah) dan software akuntansi (Accurate/Jurnal/Kledo)**

---

## 2. Landasan Pasar (dari riset)

| Data | Angka | Sumber |
|---|---|---|
| Akuntan publik Indonesia | 7.226 (Mei 2025) | IAPI via ddtc.co.id |
| UMKM non-pertanian | 30,21 jt unit (2025) | Kemenkop via kadin.id |
| Total UMKM | 65,5 jt unit | detikcom/Kemenkop 2025 |
| UMKM yang BELUM punya laporan keuangan | 84,8% | BPS via techinasia |
| WP UMKM aktif (DJP) | 4,2 jt | DJP via umkm.go.id |
| Harga software akuntansi kompetitor | Rp 140rb–900rb/bln | jurnal.id, akuntansiterbaik.com |

**Kesimpulan pasar:**
- Market bookkeeping Indonesia besar tapi **baru mulai terdigitalisasi** — 84,8% UMKM belum punya laporan keuangan = ruang besar, tapi juga berarti butuh edukasi
- Segmen paling siap bayar untuk produk kita: **tim finance perusahaan menengah + KAP/jasa akuntansi** — mereka sudah punya volume transaksi & deadline closing
- Software akuntansi (Accurate, Jurnal, Kledo) menjual **pencatatan**; Praktis menjual **otomasi input** — bisa jadi pelengkap, bukan pengganti

---

## 3. Kompetitor & Benchmark Harga

| Produk | Harga | Value yang dijual |
|---|---|---|
| **Rekeningkoran.com** | Rp400/halaman (pay-as-you-go) | Konversi RK → Excel saja |
| **REKONSIA** | Tidak publik (freemium/app) | Konversi RK → Excel |
| **Nexius.id** | Tidak publik | RK → laporan keuangan (mirip Praktis!) |
| **Mekari Jurnal** | Rp359rb–449rb/bln | Software akuntansi lengkap |
| **Accurate Online** | Rp277,5rb–333rb/bln | Software akuntansi lengkap |
| **Kledo** | Rp140rb–159rb/bln | Software akuntansi lengkap |
| **Praktis (usulan direct)** | Rp250–500/transaksi atau paket Rp500rb–2jt/bln | Dokumen → draft jurnal + laporan (review dulu) |

**Insight:**
- Rekeningkoran.com membuktikan **orang mau bayar per-halaman** untuk konversi. Tapi harga mereka sangat murah (≈Rp20/transaksi) — jangan bersaing di harga, bersaing di **kelengkapan output** (jurnal, bukan Excel)
- **Nexius.id adalah ancaman langsung** — value prop-nya hampir sama dengan Praktis. Perlu riset lebih dalam (harga, akurasi, target) untuk diferensiasi
- Software akuntansi Rp140–900rb/bln = **anchor pricing** untuk paket bulanan Praktis

---

## 4. Model Bisnis & Pricing Usulan

Dua jalur pricing yang saling melengkapi:

**A. Pay-per-use (self-serve, untuk on-ramp)**
- Rp 250/transaksi (di atas rekeningkoran.com karena output = jurnal, bukan Excel)
- Cocok: tim finance kecil yang baru coba

**B. Langganan bulanan (inti revenue)**
| Paket | Kuota | Harga |
|---|---|---|
| Starter | 1.000 tx/bln | Rp 500rb |
| Growth | 3.000 tx/bln | Rp 1,2 jt |
| Enterprise | 10.000+ tx/bln | Rp 3,5 jt (custom) |

*ARPU tertimbang target: Rp 700rb–1 jt/pelanggan/bulan*

**Kenapa langganan lebih penting:**
- Revenue predictable (vs pay-per-use yang musiman)
- Closing bulanan = usage rutin tiap bulan (rekonsiliasi, laporan)
- Upgrade path natural saat volume naik

---

## 5. Investasi Awal

### 5a. Kalau mulai dari nol (referensi)
| Item | Estimasi |
|---|---|
| Pengembangan produk (6 bulan, 1-2 engineer) | Rp 300–600 jt |
| Infrastruktur awal (1 tahun) | Rp 10–20 jt |
| Desain & branding | Rp 10–25 jt |
| **Total** | **Rp 320–645 jt** |

### 5b. Kondisi aktual Praktis (produk sudah LIVE) ✅
| Item | Estimasi/bulan |
|---|---|
| Infrastruktur Railway (web+worker+Postgres+Redis) | Rp 1–3 jt (scale: Rp 3–8 jt) |
| AI cost (model routing, ~Rp70/transaksi × volume) | Variabel — 7% dari revenue bruto |
| Domain, email, tooling (analytics, CRM) | Rp 500rb–1,5 jt |
| **Opex infra bulanan** | **Rp 2–5 jt awal** |

### 5c. Biaya pengembangan fitur direct-market (one-off)
| Fitur | Estimasi effort |
|---|---|
| Self-serve signup + payment (Midtrans/Xendit) | 2–4 minggu |
| Onboarding flow + contoh dokumen | 1–2 minggu |
| Export jurnal (CSV/format Accurate, Jurnal.id) | 1–2 minggu |
| Landing page direct + kalkulator ROI (sudah ada!) | 1 minggu |
| **Total** | **6–9 minggu dev** |

### Investasi awal riil yang dibutuhkan: **Rp 15–40 jt** (marketing 3 bulan pertama + pengembangan fitur + buffer)

---

## 6. Proyeksi Revenue (3 Skenario)

Asumsi dasar: ARPU tertimbang Rp 700rb/bln (mix paket), churn 5%/bln, harga AI cost 7% dari revenue.

### Skenario Konservatif (sulit, hati-hati)
*Growth pelanggan: +3/bln, ARPU Rp 600rb*

| Bulan | Pelanggan | MRR | Revenue kumulatif |
|---|---|---|---|
| 3 | 9 | Rp 5,4 jt | Rp 8 jt |
| 6 | 18 | Rp 10,8 jt | Rp 35 jt |
| 12 | 36 | Rp 21,6 jt | Rp 120 jt |

### Skenario Moderat (dasar perencanaan)
*Growth: +5/bln naik ke +10, ARPU Rp 800rb*

| Bulan | Pelanggan | MRR | Revenue kumulatif |
|---|---|---|---|
| 3 | 15 | Rp 12 jt | Rp 18 jt |
| 6 | 35 | Rp 28 jt | Rp 100 jt |
| 12 | 90 | Rp 72 jt | Rp 480 jt |

### Skenario Optimis (product-market fit cepat + momentum Nexius terbukti)
*Growth: +10/bln naik ke +25, ARPU Rp 1 jt*

| Bulan | Pelanggan | MRR | Revenue kumulatif |
|---|---|---|---|
| 3 | 30 | Rp 30 jt | Rp 45 jt |
| 6 | 75 | Rp 75 jt | Rp 280 jt |
| 12 | 200 | Rp 200 jt | Rp 1,8 M |

**Estimasi pelanggan rekeningkoran.com** (untuk kalibrasi): tidak ada data publik. ScamAdviser menilai traffic-nya "low rank"; situs mengklaim "ratusan tim finance". Estimasi kasar: **300–1.500 pengguna aktif/bulan** dengan mayoritas penggunaan kecil (5–50 halaman/bulan = Rp 2rb–20rb/pengguna) — artinya revenue mereka kemungkinan masih di bawah Rp 50 jt/bulan. Ini indikasi pasar **ada tapi belum digarap serius** — peluang untuk Praktis dengan value yang lebih dalam.

---

## 7. Unit Economics

| Metrik | Target |
|---|---|
| **CAC** (biaya akuisisi per pelanggan) | Rp 400–800rb (mix: organik + referral + paid) |
| **ARPU** | Rp 700rb–1 jt/bln |
| **Gross margin** (setelah AI cost + infra) | 75–85% |
| **LTV** (ARPU × gross margin ÷ churn 5%) | Rp 10,5–15 jt |
| **LTV:CAC** | **13–30×** (sehat, >3×) |
| **Payback CAC** | 1–2 bulan |

*CAC rendah karena produk self-serve + marketing mix yang dominan organik/referral di awal.*

---

## 8. Rencana Pemasaran & Biaya

### Fase 1 — Foundation (Bulan 1–3) · Budget Rp 6 jt
| Aktivitas | Biaya |
|---|---|
| Konten edukasi: LinkedIn, blog "rekening koran ke jurnal" | Rp 1 jt (tools) |
| SEO: artikel tutorial (rakor, BCA/BNI/Mandiri/BRI) | Rp 2 jt |
| Komunitas: grup akuntan, KAP, webinar kecil | Rp 1 jt |
| Cold outreach (email/WA ke 200 target) | Rp 2 jt |
| **Target:** 10–15 pelanggan pertama, CAC ~Rp 400rb |

### Fase 2 — Accelerate (Bulan 4–6) · Budget Rp 30 jt
| Aktivitas | Biaya |
|---|---|
| Google Ads (keyword: "rekening koran ke excel/jurnal") | Rp 15 jt |
| Meta Ads (retargeting + lookalike akuntan) | Rp 10 jt |
| Referral program (diskon untuk KAP & akuntan) | Rp 3 jt |
| Webinar rutin bulanan | Rp 2 jt |
| **Target:** 20 pelanggan baru, CAC naik ke Rp 600rb |

### Fase 3 — Scale (Bulan 7–12) · Budget Rp 100 jt
| Aktivitas | Biaya |
|---|---|
| Google + Meta + YouTube ads | Rp 60 jt |
| Partnership (KAP, komunitas akuntansi, kampus) | Rp 15 jt |
| Sales team ringan (1 AE) | Rp 25 jt |
| **Target:** 50+ pelanggan baru, CAC Rp 700–800rb |

**Total biaya marketing 12 bulan: ±Rp 135 jt** (skenario moderat)

---

## 9. Break-even Analysis (Skenario Moderat)

| Bulan | Revenue | Opex (infra+AI+marketing) | Kumulatif |
|---|---|---|---|
| 1–3 | Rp 18 jt | Rp 45 jt | −27 jt |
| 4–6 | Rp 100 jt | Rp 85 jt | −12 jt |
| 7–9 | Rp 250 jt | Rp 130 jt | **+120 jt** |
| 10–12 | Rp 480 jt | Rp 170 jt | **+310 jt** |

**Break-even: bulan ke-7 s/d ke-9** — modal awal Rp 15–40 jt tertutup di bulan ke-6/7.

*Catatan: angka kumulatif di atas menjumlahkan revenue vs biaya; detail bulanan ada di model spreadsheet.*

---

## 10. Risiko & Mitigasi

| Risiko | Level | Mitigasi |
|---|---|---|
| **Nexius.id sudah duluan** jual "RK → laporan keuangan" | 🔴 Tinggi | Riset kompetitif mendalam; diferensiasi: multi-dokumen (invoice+CSV+Excel), human-review flow, harga transparan |
| **Rekeningkoran.com lebih murah** (Rp400/halaman) | 🟠 Sedang | Jangan lawan di harga; jual kelengkapan (jurnal + laporan + SPT) |
| Akurasi mapping jurnal | 🟠 Sedang | Human-in-the-loop (draft + review) sudah jadi desain inti; garansi kualitas |
| Churn (perusahaan ganti tools) | 🟠 Sedang | Paket tahunan diskon; data portability (export selalu tersedia) |
| Perubahan kebijakan AI cost (model pricing) | 🟡 Rendah | Model routing (Rp70/tx) sudah dirancang; monitoring margin bulanan |
| Kompetitor software akuntansi menambahkan fitur AI | 🟡 Rendah–Sedang | Fokus ke otomasi dokumen (input), bukan ke pencatatan |

---

## 11. Rekomendasi

1. **Jalankan dual-track**: tetap jual ke KAP (ARPU tinggi, churn rendah) + buka self-serve direct (volume) — bukan pilih salah satu
2. **Fitur wajib sebelum launch direct**: self-serve signup + payment, export CSV jurnal (format Accurate/Jurnal.id), landing page (kalkulator ROI sudah siap)
3. **Riset Nexius.id dulu** (minggu ini) — harga, akurasi, target pasar mereka. Ini kompetitor paling mirip, bukan rekeningkoran.com
4. **Uji pricing 2 bulan pertama**: 30 pelanggan pertama dengan 2 harga (Rp250/tx vs paket Rp500rb) untuk lihat mana yang konversi lebih baik
5. **Budget konservatif**: mulai dengan Rp 6 jt/3 bulan marketing, jangan langsung Rp 15 jt/bulan sebelum product-market fit terbukti

---

## 12. Deep-Dive Kompetitor: Nexius AI (riset 14 Agu 2026)

### Temuan lapangan
- **nexiusai.com** = situs utama, namun **sedang under maintenance** saat dicek (perusahaan: **PT. Indonesia Kuat Sukses**)
- **nexius.id** = domain parked di Hostinger (belum digunakan)
- **Instagram @nexius.id** = channel aktif untuk promosi & support ("DM kami di Instagram")
- Value prop mereka: upload rekening koran/mutasi → **laporan keuangan lengkap <5 menit**, export PDF & Excel, jurnal accounting siap pakai, mapping otomatis, pivot
- Input: bank statements, receipts, invoices, ledgers
- **Partnership: ABDSI** (Asosiasi, Des 2025) untuk menyediakan laporan keuangan berbasis AI ke UMKM
- Pricing: **tidak dipublikasikan** (perlu DM Instagram)

### Implikasi untuk Praktis
1. **Nexius masih fase sangat awal** — situs mati untuk maintenance, domain .id belum dipakai, ketergantungan penuh ke Instagram → **window of opportunity untuk Praktis** yang sudah LIVE
2. **Target berbeda**: Nexius → UMKM (lewat partnership asosiasi), Praktis → KAP + tim finance perusahaan menengah
3. **Angle berbeda**: Nexius jual kecepatan ("<5 menit, siap pakai"), Praktis jual kontrol (draft + review). Ini diferensiasi yang bisa dieksploitasi: *"Kalau cuma 5 menit tanpa review, bagaimana jaminan akurasinya?"*
4. **Kelebihan Praktis**: multi-tenant untuk KAP, SPT Tahunan, pricing transparan, pipeline dokumen → jurnal → laporan (35K KB items live)
5. **Risiko**: Nexius punya jalur distribusi institusional (ABDSI → UMKM). Tapi segmen UMKM price-sensitive & churn tinggi — bukan target utama Praktis
6. **Tindakan**: pantau nexiusai.com (apakah kembali live + harga), follow @nexius.id untuk signal peluncuran

---

## Lampiran: Sumber Riset
- IAPI via ddtc.co.id — jumlah akuntan publik (Mei 2025)
- Kemenkop via kadin.id — UMKM non-pertanian 2025
- BPS via techinasia.com — 84,8% UMKM tanpa laporan keuangan
- DJP via umkm.go.id — WP UMKM aktif 4,2 jt
- jurnal.id / akuntansiterbaik.com — harga kompetitor
- scamadviser.com — penilaian traffic rekeningkoran.com
- Situs rekeningkoran.com (dibuka langsung) — harga & fitur

**Keterbatasan data:** jumlah pelanggan rekeningkoran.com tidak tersedia publik; estimasi pengguna (300–1.500/bln) adalah perkiraan kasar dari sinyal traffic & klaim situs. Data ARPU, CAC, dan proyeksi adalah asumsi model — harus divalidasi dengan data aktual 3 bulan pertama.
