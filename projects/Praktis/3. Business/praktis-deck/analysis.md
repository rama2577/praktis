# Analisa Produktivitas — Praktis (AI Bookkeeping)

Dokumen kerja untuk deck penawaran ke penyedia accounting service / konsultan akunting.
**Versi 3 (2026-08-09)** — skenario utama: full-automation (junior = reviewer murni, 20–30 klien).
Didasarkan pada: riset volume transaksi UMKM Indonesia (Gemini), fakta lapangan 1 junior = 4–5 klien,
dan struktur kerja nyata junior (entry + data cleaning ≈ 85% waktu).

---

## 1. Tesis inti (untuk deck)

> **Entry, data cleaning, dan rekonsiliasi menghabiskan ±85% waktu junior accountant.
> Praktis mengotomatiskan semuanya — junior berubah dari juru ketik menjadi reviewer.
> Hasilnya: 1 junior melayani 20–30 klien (dari 4–5), laporan 3–6 hari (dari 12–20),
> tanpa menambah kepala.**

## 2. Asumsi eksplisit (v3)

- 22 hari kerja; 7,5 jam efektif/hari; ~8.400 mnt produktif/bulan
- Segmen klien (riset Gemini): Mikro 100 tx/bln · Kecil 400–600 tx/bln · Menengah 1.500 tx/bln; 70% transaksi bank
- Manual: entry 2,5 mnt/tx (termasuk rekap harian), rekonsiliasi 45 dtk/item, pajak 90–240 mnt, laporan 60–120 mnt, overhead klien 325 mnt
- **Full-automation (Praktis): entry/cleaning/rekonsiliasi = 0**; junior hanya:
  - review jurnal batch 5 dtk/jurnal (confidence score + exception routing → transaksi rutin di-scan berkelompok)
  - verifikasi pajak (draft otomatis) & laporan (generate otomatis)
  - menangani exception (3 mnt/exception)
  - komunikasi klien (overhead 150–200 mnt — dikelola via portal/template/SLA)

## 3. Skenario perhitungan

### 3a. Manual (baseline — kalibrasi 4–5 klien/junior)

| Komponen | Mikro (100 tx) | Kecil (400 tx) | Kecil (600 tx) | Menengah (1.500 tx) |
|---|---|---|---|---|
| Entry + cleaning | 250 | 1.000 | 1.500 | 3.750 |
| Rekonsiliasi bank | 53 | 210 | 315 | 788 |
| Adjustment | 20 | 45 | 45 | 60 |
| Pajak | 90 | 180 | 180 | 240 |
| Laporan | 60 | 90 | 90 | 120 |
| Overhead klien | 325 | 325 | 325 | 325 |
| **Total** | **798** | **1.850** | **2.455** | **5.283** |
| **Kapasitas (8.400 mnt)** | **10,5 klien** | **4,5 klien** | **3,4 klien** | **1,6 klien** |

✅ Baseline mereproduksi fakta lapangan: **4–5 klien/junior** untuk klien kecil.

### 3b. Full-automation (Praktis — junior reviewer murni)

| Komponen | Mikro (100 tx) | Kecil (400 tx) | Kecil (600 tx) | Menengah (1.500 tx) |
|---|---|---|---|---|
| Review jurnal (5 dtk/tx) | 8 | 33 | 50 | 125 |
| Rekonsiliasi (konfirmasi batch) | 5 | 10 | 15 | 25 |
| Adjustment + pajak + laporan | 45 | 60 | 85 | 120 |
| Overhead komunikasi | 150 | 175 | 175 | 200 |
| **Exception 10% (3 mnt/flag)** | 30 | 120 | 180 | 450 |
| **Total (exception 10%)** | **238** | **398** | **505** | **920** |
| Total (exception 5%, data rapi) | 208 | 338 | 430 | 645 |
| **Kapasitas (10% exception)** | **35 klien** | **21 klien** | **17 klien** | **9 klien** |
| Kapasitas (5% exception) | 40 | 25 | 20 | 13 |

### 3c. Kesimpulan kapasitas junior

| Segmen | Manual | Praktis | Peningkatan |
|---|---|---|---|
| Mikro | ~10 | 35–40 | **3,5–4×** |
| **Kecil 400 tx (mayoritas)** | **4–5** | **21–25** | **~5×** |
| Kecil 600 tx | 3,4 | 17–20 | **5–6×** |
| Menengah | 1,6 | 9–13 | **5,5–8×** |
| **Portofolio campur (target deck)** | **4–5** | **20–30** | **5–6×** |

> **Klaim utama deck: 1 junior = 20–30 klien** (portofolio mikro–kecil, exception ≤5–10%).
> Cek silang "85% hilang": 4,5 klien × 8.400 mnt; hilangkan 85% → ±280 mnt/klien → **±30 klien**. Konsisten.

## 4. Variabel penentu (mengapa 20–30 bisa / tidak bisa)

| Variabel | Pengaruh | Cara mengendalikan |
|---|---|---|
| **Exception rate** (paling dominan) | 400 tx × 10% × 3 mnt = 120 mnt (30% beban teknis); 20% → kapasitas turun ke ~16 klien | Data digital rapi (export bank, faktur terstruktur), onboarding standar, template dokumen klien |
| **Overhead komunikasi** | 25 klien × 175 mnt ≈ 73 jam/bln | Portal klien self-service, template, SLA komunikasi, komunikasi async |
| Pajak & laporan | Tidak bisa 0 (verifikasi tetap) ±45–60 mnt/klien | Draft otomatis dari jurnal APPROVED |
| Beban kognitif junior | 25–30 hubungan + tenggat pajak | Rotasi klien, asisten admin untuk komunikasi |
| Kualitas AI | Confidence tinggi → review batch makin cepat | Rule engine + knowledge base terus dilatih dari data riil |

## 5. Cycle days

| Tahap | Manual | Praktis |
|---|---|---|
| Pengumpulan data | 3–7 hari | 0–1 hari (upload email/drive/WA) |
| Entry + rekonsiliasi | 3–6 hari (batch) | detik (AI) + 1–2 hari (review streaming) |
| Adjustment + pajak | 2–3 hari | 1–2 hari |
| Review senior + approval | 2–3 hari | 1–2 hari |
| Laporan & kirim | 1–2 hari | instan (generate) |
| **Total** | **12–20 hari** | **3–6 hari** (**−70%**) |

Batas bawah = kecepatan klien kirim data. Praktis memotong sisi firma sepenuhnya.

## 6. Kapasitas senior (bottleneck yang berpindah)

Otomasi membuat junior 5× lebih besar → **bottleneck pindah ke review senior**.
- Manual: 1 senior = 3–5 junior (14–25 klien)
- Praktis tanpa strategi risiko: senior hanya sanggup 3,4 junior (review per transaksi tidak ikut terotomasi)
- **Praktis dengan confidence-first** (review penuh hanya item berisiko/exception, sisanya spot check):
  1 senior = **4–6 junior → 80–150 klien** (di portofolio 20–30 klien/junior)

> Slide khusus deck: *"Praktis menggeser bottleneck ke review senior — dan menjawabnya dengan
> confidence scoring + exception routing: senior fokus ke yang berisiko."*

## 7. Dampak bisnis (narrative deck)

| Metrik | Manual | Praktis |
|---|---|---|
| Klien / junior | 4–5 | 20–30 |
| Revenue / junior (fee ±Rp 1,5–2 jt mikro-kecil) | Rp 6–15 jt/bln | **Rp 30–60 jt/bln** |
| Gaji junior | Rp 4–7 jt | Rp 4–7 jt (tetap) |
| Margin per head | tipis/negatif | **80%+** |
| Cycle days | 12–20 | 3–6 |
| Beban pajak / klien | 90–240 mnt | 30–120 mnt (−65%) |

**Model bisnis baru yang dimungkinkan:**
- **High-volume / low-touch**: segmen mikro (30–150 tx) yang tadinya tidak ekonomis (fee kecil, waktu sama) kini menguntungkan → firma bisa buka segmen baru.
- **Skala tanpa menambah lapisan**: senior mengawal 4–6 junior × 20–30 klien.
- **SLA kompetitif**: "laporan H+5" sebagai pembeda.

## 8. Risiko & batasan (jujur di deck)

1. **Exception rate** menentukan realisasi 20–30; scan jelek/foto HP → turun ke 15–18. Praktis tidak mengarang — memflag untuk manusia.
2. **Overhead komunikasi** naik porsinya (25 klien = 25 hubungan); perlu portal/template/SLA.
3. Cycle floor = kecepatan klien kirim data.
4. Kompleksitas entitas/konsolidasi/kasus pajak khusus → di luar MVP, tetap manual + senior.
5. Review substantif senior tidak hilang — judgment akuntan tetap (PSAK & pajak tanggung jawab manusia).
6. Angka 20–30 adalah potensi dengan proses terstandar, onboarding baik, dan data digital.

## 9. Angka kunci slide "math" (v3)

| Metrik | Manual | Praktis | Δ |
|---|---|---|---|
| Entry + cleaning + rekonsiliasi | 85% waktu junior | ~0% (otomatis) | **−100%** |
| Waktu per transaksi (junior) | 2,5–3,5 mnt | 5–10 dtk (review batch) | **−95%** |
| Cycle days | 12–20 hari | 3–6 hari | **−70%** |
| Klien / junior (mikro) | ~10 | 35–40 | 3,5–4× |
| **Klien / junior (kecil, mayoritas)** | **4–5** | **21–25** | **5×** |
| Klien / junior (menengah) | 1,6 | 9–13 | 5,5–8× |
| **Klien / junior (portofolio campur)** | **4–5** | **20–30** | **5–6×** |
| Junior / senior | 3–5 | 4–6 | ~1,3× |
| Klien / senior | 14–25 | 80–150 | **5×** |
| Beban pajak | 90–240 mnt | 30–120 mnt | **−65%** |

## 10. Struktur deck (11 slide)

1. Judul — Praktis: AI Bookkeeping untuk Accounting Service
2. Masalah — 85% waktu junior habis untuk entry & cleaning ("di mana waktu tim Anda hilang")
3. Solusi — pipeline AI: upload → draft (PSAK/PPN) → review 4 lapis → laporan
4. **Math** — tabel angka kunci v3 (baseline kalibrasi 4–5 → 20–30 klien)
5. Cycle days — timeline manual vs Praktis (12–20 → 3–6)
6. Kapasitas per head — segmen mikro/kecil/menengah
7. Simulasi 1 klien kecil (400 tx/bln) — rincian menit sebelum/sesudah
8. "Bottleneck berpindah ke senior" → confidence scoring & exception routing
9. Fitur kunci — traceability PSAK, confidence, exception, SLA, RBAC 4 role
10. Keamanan & adopsi — enkripsi at-rest, audit trail, human-in-the-loop, pilot 1 klien
11. CTA

_Siap dipakai saat perintah "produksi deck"._

---

# 11. Update v4 — Portal Klien (2026-08-09)

> Keputusan Rama: setiap klien punya **landing page pribadi** (login sendiri, upload data sendiri,
> lihat laporan standar + analisa + chart + komentar AI). **Digital imaging sudah dibuat (images/11–16),
> deck BELUM direvisi** — menunggu perintah. Dokumen ini = dasar hitung ulang produktivitas.

## 11a. Apa yang berubah vs v3

| Variabel | v3 (tanpa portal) | v4 (dengan portal klien) | Alasan |
|---|---|---|---|
| Overhead komunikasi | 150–200 mnt/klien | **60–90 mnt** (ambil 75) | Klien upload sendiri, status real-time (tidak nanya "mana laporannya?"), laporan self-service, reminder otomatis; sisa = follow-up data kurang & komunikasi kualitatif |
| Penerimaan data | staf rapikan manual | **langsung ke pipeline** (0 mnt) | Upload terstruktur drag-drop → AI langsung proses |
| Exception rate | 5–10% (kontrol via onboarding) | **5–10%** (tetap; portal menekan ke arah 5%) | Data digital langsung dari klien (export bank/faktur) |
| Fee per klien | Rp 1,5–2 jt | **Rp 1,8–2,75 jt** (paket analisa + komentar AI = premium) | Layanan analisa & wawasan AI jadi upsell |
| Nilai non-kuantitatif | — | retensi naik, klien lihat progress, diferensiasi kompetitif | — |

## 11b. Perhitungan ulang kapasitas junior (Praktis + Portal Klien)

Manual baseline sama dengan v3 (tabel 3a). Skenario baru:

| Komponen (mnt/bln) | Mikro (100 tx) | Kecil (400 tx) | Kecil (600 tx) | Menengah (1.500 tx) |
|---|---|---|---|---|
| Review jurnal (5 dtk/tx) | 8 | 33 | 50 | 125 |
| Rekonsiliasi (konfirmasi) | 5 | 10 | 15 | 25 |
| Adj + pajak + laporan | 45 | 60 | 85 | 120 |
| Overhead (portal self-service) | 60 | 75 | 75 | 90 |
| Exception 10% (3 mnt/flag) | 30 | 120 | 180 | 450 |
| **Total (exception 10%)** | **148** | **298** | **405** | **810** |
| Total (exception 5%) | 118 | 253 | 345 | 585 |
| **Kapasitas (10%)** | **50–60** | **26–30** | **19–22** | **9–12** |
| Kapasitas (5%) | 65–70 | 30–33 | 22–24 | 12–14 |

Cek silang: 8.400 / 298 = 28,2 klien kecil (v3: 21,1). Mikro: 8.400 / 148 = 56,7 (v3: 35,3).

### 11c. Kesimpulan kapasitas

| Segmen | Manual | v3 | **v4 (portal)** |
|---|---|---|---|
| Mikro | ~10 | 35–40 | **50–60** (matematis; batas kognitif membatasi) |
| **Kecil 400 tx** | **4–5** | **21–25** | **26–30** |
| Kecil 600 tx | 3,4 | 17–20 | **19–22** |
| Menengah | 1,6 | 9–13 | **9–12** |
| **Portofolio campur (klaim deck)** | **4–5** | **20–30** | **25–30 realistis · s.d. 35 matematis** |

> **Klaim deck v4: 1 junior = 25–30 klien (bisa sampai 35 dengan data digital rapi)** — dari 4–5.
> Portal klien menaikkan batas kognitif juga: komunikasi jadi async & self-service,
> sehingga batas non-matematis (25–30 hubungan) ikut naik dibanding v3.

### 11d. Simulasi 1 klien kecil (400 tx/bln) — angka deck

| Komponen | Manual | v3 | **v4** |
|---|---|---|---|
| Entry + cleaning | 1.000 | 0 | **0** |
| Rekonsiliasi | 210 | 10 | **10** |
| Pajak + laporan + adj | 315 | 60 | **60** |
| Overhead klien | 325 | 175 | **75** (−77%) |
| Exception (10%) | — | 120 | **120** |
| Review jurnal | — | 33 | **33** |
| **Total** | **1.850** | **398** | **298 (−84%)** |

Insight: dengan portal, **exception kini komponen terbesar (40% beban teknis)** → nilai jual "data digital
langsung dari klien" makin kuat (upload terstruktur + template → exception turun ke arah 5%).

### 11e. Dampak bisnis (v4)

| Metrik | Manual | v4 |
|---|---|---|
| Klien / junior | 4–5 | **25–30** (s.d. 35) |
| Revenue / junior (fee 1,8–2,75 jt + paket analisa) | Rp 6–15 jt | **Rp 45–75 jt/bln** |
| Margin per head | tipis/negatif | **80%+** |
| Cycle days | 12–20 | **3–6** (bisa 3–5 dgn disiplin upload) |
| Overhead komunikasi / klien | 325 mnt | **75 mnt (−77%)** |
| Beban pajak / klien | 90–240 mnt | 30–120 mnt (−65%) |

### 11f. Kelebihan fitur portal (untuk deck)

1. **Klien upload sendiri** → data digital langsung ke pipeline; junior tidak menerima/merapikan file
2. **Status real-time** (diterima → diproses → review → siap) → hilangkan chase "mana laporannya?"
3. **Laporan self-service**: laba rugi, neraca, arus kas, rekap PPN — unduh PDF/XLSX kapan saja
4. **Analisa keuangan**: chart & graph (tren pendapatan, margin, rasio, beban per kategori)
5. **Komentar AI**: wawasan otomatis per bulan + rekomendasi tindakan (dengan disclaimer)
6. **Notifikasi & deadline**: reminder upload, SLA H+5, jatuh tempo PPN
7. **Upsell premium**: paket analisa + wawasan AI → fee & margin naik, retensi naik

### 11g. Risiko & batasan tambahan (jujur di deck)

1. Angka 25–30 = potensi dengan data digital rapi & exception ≤5–10%; foto HP/scan jelek → 18–22.
2. Batas kognitif: 30+ hubungan tetap berat → rotasi klien & pembagian per segmen.
3. Komentar AI bersifat informatif — keputusan akhir tetap akuntan (disclaimer di UI).
4. Portal = lingkup tambahan (auth klien, RBAC klien, notifikasi) — perlu roadmap pengembangan.

### 11h. Saran struktur deck (13 slide — belum dieksekusi)

1 Judul · 2 Masalah · 3 Solusi pipeline · 4 Math · 5 Cycle days · 6 Kapasitas · 7 Simulasi ·
8 Bottleneck senior · 9 Fitur internal · **10 Portal Klien (embed 12-beranda, 13-upload)** ·
**11 Analisa & Wawasan AI (embed 15-analisa, 16-wawasan)** · 12 Kepercayaan & adopsi · 13 CTA.
(11-login-klien & 14-laporan-klien sebagai pendukung/alternatif embed.)

### 11i. Digital imaging portal klien (selesai)

`images/11-login-klien.png` · `12-beranda-klien.png` · `13-upload-klien.png` · `14-laporan-klien.png` ·
`15-analisa-klien.png` · `16-wawasan-ai.png` — generator: `generate_client_mockups.py` (mockups/11–16).
Cerita demo konsisten: PT Sentosa Raya, INV-2026-0812, laporan Juli 2026, HPP naik 8,2% → margin 23,0%.
