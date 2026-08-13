# Analisis Komersial & Pricing — Praktis (AI Bookkeeping)

> Tanggal: 2026-08-13 · Target gross profit: **85%** · Mata uang: Rupiah
> Stack biaya nyata: Vercel (web) + Railway (API + Postgres 16) + LLM API + object storage.

## 1. Biaya Bulanan (COGS)

### 1a. Infrastruktur (shared, semua firma dalam 1 tenant multi-tenant)

| Komponen | Hemat (fase awal) | Standar (produksi) |
|---|---|---|
| Vercel (web, Next.js) | Hobby — gratis | Pro — Rp 320rb |
| Railway (API container) | ± Rp 300rb | ± Rp 500rb |
| Postgres 16 (Railway) | ± Rp 200rb | ± Rp 350rb |
| Object storage dokumen | Rp 50rb | Rp 150rb |
| Domain + email | Rp 50rb | Rp 80rb |
| Monitoring/analytics | Rp 0 (free tier) | Rp 100rb |
| **Total infrastruktur** | **± Rp 600rb/bln** | **± Rp 1,5jt/bln** |

Kunci: **multi-tenant** — satu set infrastruktur melayani SEMUA firma, jadi biaya ini ter-amortisasi per firma (bukan per klien).

### 1b. Biaya AI (variabel, per klien per bulan) — COGS dominan

Asumsi: ±5.000 token/transaksi (OCR/parse + klasifikasi + draft + validasi), model flash-class ±$0,7/M token → ±Rp 55/transaksi, dibuffer 2× untuk edge case.

| Segmen klien | Transaksi/bln | COGS AI/bln | COGS storage/bln | Total COGS langsung |
|---|---|---|---|---|
| Mikro | 100 | ± Rp 10rb | Rp 3rb | **± Rp 13rb** |
| Kecil | 400 | ± Rp 40rb | Rp 3rb | **± Rp 43rb** |
| Menengah | 1.500 | ± Rp 150rb | Rp 5rb | **± Rp 155rb** |

## 2. Harga Jual Minimum per Klien (agar GP 85%)

Rumus: `harga = COGS / (1 − 85%) = COGS / 0,15`

| Segmen | COGS langsung | Harga minimum (GP 85%) | Harga jual rekomendasi | Margin aktual |
|---|---|---|---|---|
| Mikro (100 tx) | Rp 13rb | Rp 87rb | **Rp 400rb** | 97% |
| Kecil (400 tx) | Rp 43rb | Rp 287rb | **Rp 650rb** | 93% |
| Menengah (1.500 tx) | Rp 155rb | Rp 1,03jt | **Rp 1,1–1,2jt** | 85–87% |

→ **Keputusan strategis sebelumnya (Rp 300–700rb/klien/bln) valid untuk segmen mikro–kecil.** Segmen menengah harus dipatok premium (Rp 1jt+) atau pakai usage-based (Rp 400–600/transaksi di atas 1.000 tx) supaya margin tetap ≥85%.

## 3. Tiering Harga per Firma (jumlah klien yang ditangani)

Volume discount bertahap, tetap menjaga GP ≥85% (asumsi mix segmen 40% mikro / 40% kecil / 20% menengah → COGS AI rata-rata ±Rp 50rb/klien; 20 firma aktif → share infra ±Rp 75rb/firma).

| Tier | Klien per firma | Harga per klien/bln | Revenue firma/bln | COGS firma/bln | Gross profit |
|---|---|---|---|---|---|
| 1 | 1–10 | **Rp 750rb** | Rp 7,5jt | Rp 0,6jt | **92%** |
| 2 | 11–25 | **Rp 650rb** | Rp 16,3jt | Rp 1,3jt | **92%** |
| 3 | 26–50 | **Rp 550rb** | Rp 27,5jt | Rp 2,6jt | **91%** |
| 4 | 51–100 | **Rp 450rb** | Rp 45jt | Rp 5,1jt | **89%** |
| 5 | 101+ | **Rp 400rb** (floor) | Rp 80jt | Rp 10,1jt | **87%** |

Semua tier ≥85% ✓. Floor Rp 400rb — jangan diturunkan, karena margin segmen menengah sudah tipis di harga itu.

**Biaya tambahan sekali jalan (onboarding):** setup fee **Rp 3jt per firma** (migrasi data, konfigurasi COA, training tim) — sekaligus menutup infra fase awal saat jumlah firma masih 1–5.

## 4. Fase Awal (jujur soal ramp)

Dengan **1 firma saja**, infrastruktur Rp 1,5jt/bln belum ter-amortisasi:
- 20 klien @ Rp 650rb → Rev Rp 13jt · COGS (1,5jt + 1jt AI) = Rp 2,5jt → **GP 81%** (di bawah target)
- Solusi fase awal:
  1. **Infra hemat ±Rp 600–800rb/bln** (Vercel Hobby + Railway mini) → GP naik ke **~87%**
  2. **Setup fee Rp 3jt** menutup sisa biaya onboarding & infra bulan-bulan pertama
  3. Target 85% tercapai penuh saat **≥10–15 firma aktif** (share infra per firma ≤ Rp 100rb)

## 5. Unit Economics & Valuasi

| Metrik | Nilai | Dasar |
|---|---|---|
| ARPU (rata-rata per klien) | **Rp 550rb/bln** | mix tier 1–3 |
| COGS per klien (rata-rata) | ± Rp 60rb | AI 50rb + storage + share infra |
| Gross profit per klien | **± Rp 490rb/bln (89%)** | — |
| Churn asumsi B2B SMB | 2,5%/bln | — |
| **LTV per klien** | **± Rp 22jt** | ARPU ÷ churn |
| CAC (demo-led, B2B) | Rp 1,5–3jt | sales ringan + demo |
| **LTV : CAC** | **7–14×** | sehat (>3×) |

**Break-even perusahaan** (asumsi opex non-COGS ±Rp 25–40jt/bln utk tim kecil): butuh revenue ±Rp 30–46jt/bln ≈ **3–5 firma tier 2 (15–25 klien)** atau ±50–85 klien aktif.

**Revenue potensial**: 50 firma × 30 klien × Rp 550rb = **±Rp 825jt/bln** (MRR) — pangsa kecil dari ribuan firma akuntansi Indonesia.

## 6. Rekomendasi Implementasi Pricing

1. **Paket berjenjang per firma** (Tier 1–5 di atas) + **setup fee Rp 3jt** sekali jalan.
2. **Surcharge segmen**: klien ≥1.000 tx/bln dikenai +Rp 300rb/klien ATAU usage-based Rp 500/transaksi di atas 1.000 tx.
3. **Komitmen 3–6 bulan** untuk tier 4–5 (mengunci volume, menurunkan churn).
4. **Pilot pricing** (3 bulan pertama): Tier 1 flat Rp 750rb + setup fee diskon 50% — tarik firma pertama, kumpulkan case study.
5. Naikkan ke Rp 400rb floor hanya bila harga model AI turun signifikan atau batch processing menurunkan COGS.


---

## 7. Alternatif: Pricing Berbasis Jumlah Transaksi (Usage-Based)

### 7a. Rumus dasar

COGS AI aman per transaksi (termasuk retry & dokumen kotor): **±Rp 100/transaksi**.
Harga per transaksi agar GP 85%: `100 / 0,15 = ±Rp 667` → **Rp 700/transaksi**.

Biaya tetap per klien (storage + laporan + dukungan minimal): ±Rp 23rb → **base fee Rp 200rb/klien/bln** (menutup klien sepi & biaya onboarding berjalan).

### 7b. Model paket kuota (base + kuota transaksi)

| Paket | Kuota | Harga/bln | COGS | GP |
|---|---|---|---|---|
| **Mikro** | 100 tx | **Rp 250rb** | ±Rp 18rb | 93% |
| **Kecil** | 500 tx | **Rp 500rb** | ±Rp 58rb | 88% |
| **Menengah** | 2.000 tx | **Rp 1,5jt** | ±Rp 210rb | 86% |
| **Over-quota** | per tx | **Rp 700/tx** | ±Rp 100/tx | 86% |

Semua ≥85% ✓ (asumsi firma ≥10–15 klien sehingga share infra per klien kecil).

### 7c. Perbandingan dua model

| Segmen | Per klien flat | Per transaksi (paket) | Kesan |
|---|---|---|---|
| Mikro 100 tx | Rp 400rb | Rp 250rb | usage lebih murah & adil |
| Kecil 400–500 tx | Rp 650rb | Rp 500rb | usage lebih murah |
| Menengah 1.500–2.000 tx | Rp 1,1–1,2jt | Rp 1,25–1,5jt | sebanding/lebih mahal sesuai volume |

### 7d. Risiko & mitigasi usage-based

| Risiko | Mitigasi |
|---|---|
| Revenue volatil (transaksi naik-turun) | Base fee Rp 200rb + paket kuota (bukan murni per tx) |
| Klien sepi → revenue kecil | Base fee menutup biaya tetap |
| Metering tidak akurat → dispute | Sumber tunggal: JournalLine APPROVED + Document diproses; tampilkan usage real-time di dashboard klien |
| Free-rider (upload sedikit, minta banyak laporan) | Laporan/export dihitung terpisah atau dibatasi paket |

### 7e. Implementasi teknis di Praktis

1. **Sumber metering** (data sudah ada, tanpa migrasi):
   - `COUNT(JournalLine)` per klien per bulan dari jurnal `APPROVED/FINALIZED` (transaksi yang benar-benar diproses).
   - `COUNT(Document)` per klien per bulan (dokumen masuk pipeline, termasuk yang direview).
2. **Tabel `UsageMeter`**: `clientId, period, transactionCount, documentCount, aiTokens` — di-update pipeline worker (batch harian) + job penutup bulan.
3. **API billing**: `GET /api/billing/usage?clientId&period` → dipakai halaman Klien (progress kuota) & invoice bulanan otomatis.
4. **Notifikasi** saat 80%/100% kuota terpakai (outbox/notifikasi existing).

### 7f. Rekomendasi

Gunakan **model hybrid**: tiering per firma (Bagian 3) sebagai harga dasar + opsi paket per-transaksi untuk firma yang lebih suka transparansi. Atau jadikan usage-based sebagai **paket "Pay-as-you-go"** untuk klien menengah (≥1.000 tx) yang selama ini sulit dipatok flat.


---

## 8. Model Hybrid Final (Rekomendasi)

Dua lapis: **Platform Fee per firma** (menutup infra & platform) + **Paket per klien** (flat ATAU kuota transaksi). Klien menengah **wajib kuota** karena margin flat-nya tipis.

### 8a. Lapis 1 — Platform Fee per firma/bln (tier by jumlah klien aktif)

| Klien aktif | Platform fee |
|---|---|
| 1–10 | Rp 1jt |
| 11–25 | Rp 1,5jt |
| 26–50 | Rp 2jt |
| 51+ | Rp 2,5jt (cap) |

### 8b. Lapis 2 — Paket per klien/bln

| Paket | Batas | Flat | Kuota | Over-quota |
|---|---|---|---|---|
| **Mikro** | ≤150 tx/bln | Rp 400rb | Rp 250rb / 100 tx | Rp 700/tx |
| **Kecil** | ≤600 tx/bln | Rp 650rb | Rp 500rb / 500 tx | Rp 700/tx |
| **Menengah** | >600 tx/bln | — (wajib kuota) | Rp 1,5jt / 2.000 tx | Rp 700/tx |

### 8c. Cek margin semua kombinasi (asumsi 15 firma aktif → share infra ±Rp 100rb/firma)

| Skenario firma | Revenue/bln | COGS/bln | GP |
|---|---|---|---|
| A · 8 klien (5 mikro flat + 3 kecil flat) | Rp 4,95jt | Rp 0,29jt | **94%** |
| B · 20 klien (8 mikro + 10 kecil + 2 menengah, kuota) | Rp 11,5jt | Rp 0,94jt | **92%** |
| C · 60 klien (40/40/20, kuota) | Rp 38,5jt | Rp 3,3jt | **91%** |

Semua ≥85% ✓ — kuncinya: **menengah selalu usage-based**, jadi tidak ada kombinasi yang margin-nya tipis.

### 8d. Mekanisme billing hybrid

1. Setiap klien punya `billingMode: FLAT | QUOTA` + `package: MIKRO | KECIL | MENENGAH` (dari rata-rata transaksi 3 bulan terakhir).
2. Setiap bulan: tagihan = platform fee (tier # klien aktif) + Σ paket klien + over-quota `(transaksi − kuota) × Rp 700`.
3. Metering dari `UsageMeter` (COUNT JournalLine APPROVED/FINALIZED per klien-periode) — tampil sebagai progress kuota di halaman klien.
4. Invoice otomatis berisi rincian per klien: paket, kuota terpakai, over-quota.

### 8e. Ilustrasi tagihan Firma B (20 klien)

- Platform fee: Rp 1,5jt
- 8 mikro kuota: Rp 2jt (800 tx, terpakai 780 → 0 over)
- 10 kecil kuota: Rp 5jt (5.000 tx, terpakai 5.240 → 240 × Rp 700 = Rp 168rb)
- 2 menengah kuota: Rp 3jt (4.000 tx, terpakai 3.900 → 0 over)
- **Total tagihan bulan: Rp 11,67jt** (COGS ±Rp 0,94jt → GP 92%)


---

## 9. Menangani Klien Tahunan / Musiman (Engagement)

Firma akuntansi punya 2 tipe pekerjaan: (1) retainer bulanan (bookkeeping) dan (2) penugasan tahunan
(tutup buku, laporan tahunan, SPT Tahunan, audit) — klien hanya "datang" sekali setahun. Model bulanan
tidak berlaku; gunakan **paket penugasan (engagement)**.

### 9a. Prinsip

- Klien tahunan = satu penugasan dengan volume transaksi tahunan yang diproses dalam 1–3 bulan.
- Tagihan **di muka saat penugasan dimulai** (cash flow sehat, tanpa retainer yang dibenci klien tahunan).
- Metering tetap sama (transaksi diproses saat bulan pengerjaan) — `UsageMeter` tidak berubah.

### 9b. Paket Tahunan (per penugasan)

| Paket | Volume/thn | COGS | Harga min (GP85%) | Harga jual | GP |
|---|---|---|---|---|---|
| Mikro tahunan | 1.200 tx | Rp 156rb | Rp 1,04jt | **Rp 2,5jt** | 94% |
| Kecil tahunan | 4.800 tx | Rp 520rb | Rp 3,47jt | **Rp 4,5jt** | 88% |
| Menengah tahunan | 18.000 tx | Rp 1,86jt | Rp 12,4jt | **Rp 13jt** | 86% |

+ Add-on opsional: **penyusunan SPT Tahunan / laporan tahunan Rp 1jt** (COGS kecil → margin tebal).

### 9c. Penyesuaian platform fee & tiering firma campuran

- Platform fee dihitung dari **klien aktif bulan ini** (bukan total terdaftar) — klien tahunan hanya aktif saat dikerjakan.
- Firma campuran: bulanan (paket §8) + tahunan (paket §9b) jalan berdampingan.

**Ilustrasi Firma D** (8 klien terdaftar: 5 bulanan + 3 tahunan kecil, dikerjakan Jan–Mar):

| Komponen | Revenue rata-rata/bln |
|---|---|
| Platform fee (≤10 aktif) | Rp 1jt |
| 3 mikro flat + 2 kecil kuota (bulanan) | Rp 2,2jt |
| 3 tahunan kecil (3 × Rp 4,5jt ÷ 12) | Rp 1,125jt |
| **Total** | **±Rp 4,3jt** (COGS ±Rp 0,5jt → GP 88%) |

Cash flow nyata: **spike Q1** (Rp 13,5jt masuk Jan–Mar) — sehat, tapi perlu pengelolaan:
- Tagih klien tahunan **di muka** (kontrak penugasan).
- Jangan jadikan klien tahunan sebagai basis MRR — MRR datang dari paket bulanan + platform fee.

### 9d. Implementasi di Praktis

1. `Client.billingMode: MONTHLY | ANNUAL` — ANNUAL punya `annualPackage` + `engagementMonths` (bulan pengerjaan).
2. Invoice penugasan dibuat di muka (rincian: paket tahunan + add-on + over-quota bila volume melampaui kuota tahunan, tetap Rp 700/tx).
3. Platform fee tier memakai **klien aktif** (billingMode MONTHLY + ANNUAL yang sedang dalam bulan pengerjaan).
4. Dashboard firma menampilkan **MRR (bulanan) terpisah dari pipeline penugasan (tahunan)** — dua angka revenue yang jangan dicampur.

### 9e. Catatan strategis

- Diskon tahunan opsional: 12× bulanan (Rp 6jt utk kecil kuota) vs paket tahunan Rp 4,5jt = diskon 25% — alat jual untuk konversi klien bulanan jadi tahunan (mengunci engagement & mengurangi churn).
- Jangan pernah mengunci seluruh revenue pada penugasan tahunan — baseline MRR (platform + retainer bulanan) adalah penopang break-even.


---

## 10. Final: Dua Jalur Pricing + Band GP 70–85%

### 10a. Keputusan: bedakan jalur periodik vs tahunan

| Dimensi | Jalur Periodik (bulanan) | Jalur Tahunan (penugasan) |
|---|---|---|
| Pekerjaan | Bookkeeping bulanan, retainer | Tutup buku, SPT Tahunan, audit |
| **Deliverable kunci** | Laporan bulanan, TB, rekonsiliasi | **SPT Tahunan + rekapitulasi laporan periodik → tahunan** |
| Volume | 100–2.000 tx/bln | 1.200–18.000 tx/thn (diproses 1–3 bulan) |
| Billing | Bulanan | **Di muka per penugasan** |
| Risiko churn | Tinggi (tiap bulan) | Rendah (terkunci per tahun) |
| Basis MRR | Ya (penopang break-even) | Tidak (pipeline/cash spike) |

**Target GP: band 70–85%** (bukan lagi ≥85%). Rumus harga: `COGS penuh / (1 − GP)`.

### 10b. COGS penuh per produk (baru — termasuk support & payment fee)

COGS = AI + storage + **support ±Rp 50rb/klien/bln (1 CS utk ±100 klien)** + **payment fee 3%**.

| Produk | COGS tetap | + 3% payment |
|---|---|---|
| Mikro (100 tx/bln) | Rp 66rb | ya |
| Kecil (400–500 tx/bln) | Rp 96rb | ya |
| Menengah (2.000 tx/bln) | Rp 210rb | ya |
| Over-quota (per tx) | Rp 100/tx | ya |
| Tahunan mikro (1.200 tx) | Rp 181rb | ya |
| Tahunan kecil (4.800 tx) | Rp 541rb | ya |
| Tahunan menengah (18.000 tx) | Rp 1,885jt | ya |
| Add-on SPT Tahunan | Rp 65rb | ya |

### 10c. Tabel harga final (semua GP dalam band 70–85% ✓)

**Jalur Periodik — per klien/bln:**

| Paket | Harga | GP |
|---|---|---|
| Mikro flat | Rp 400rb | 80% |
| Mikro kuota 100 tx | Rp 300rb | 75% |
| Kecil flat | Rp 650rb | 82% |
| Kecil kuota 500 tx | Rp 550rb | 79% |
| Menengah kuota 2.000 tx | Rp 1,1jt | 78% |
| Over-quota | Rp 500/tx | 78% |

**Jalur Tahunan — per penugasan (di muka):**

| Paket | Harga | GP |
|---|---|---|
| Mikro tahunan 1.200 tx | Rp 1,2jt | 82% |
| Kecil tahunan 4.800 tx | Rp 3,5jt | 81% |
| Menengah tahunan 18.000 tx | Rp 10jt | 78% |
| Add-on SPT Tahunan (1771 + rekapitulasi tahunan) | Rp 400rb | 81% |

**Platform fee — per firma/bln (menutup infra):**

| Klien aktif | Fee | GP |
|---|---|---|
| 1–10 | Rp 700rb | ±82% |
| 11–25 | Rp 900rb | ±83% |
| 26–50 | Rp 1,2jt | ±84% |
| 51+ | Rp 1,5jt | ±85% |

### 10d. Mengapa band 70–85% justru lebih sehat

- **Batas atas 85%** = disiplin harga: mencegah harga terlalu mahal vs nilai; COGS rendah bukan alasan menaikkan harga di atas nilai pasar (klien mikro 100 tx tetap layak Rp 300–400rb karena value bookkeeping, bukan karena biaya).
- **Batas bawah 70%** = proteksi: menolak pekerjaan yang margin-nya tergerus (mis. klien menengah flat tanpa kuota, diskon berlebihan).
- Kunci teknis di Praktis: jalur tahunan memakai **modul SPT 1771 + rekapitulasi multi-periode/tahunan + sign-off** — produk yang sudah ada.

### 10e. Implementasi (ringkas)

`Client.billingMode: MONTHLY | ANNUAL` · `plan: MIKRO|KECIL|MENENGAH` + `billing: FLAT|QUOTA` · invoice bulanan (periodik) & di muka (tahunan) · metering `UsageMeter` (JournalLine APPROVED) · dashboard firma: **MRR terpisah dari pipeline penugasan** · alert kuota 80%/100% + auto over-quota Rp 500/tx.


---

## 11. MODEL FINAL TERPILIH: Kuota-Only per Klien (tanpa platform fee)

Keputusan Rama (2026-08-13): buang harga per firma; harga murni per klien; tanpa paket flat;
3 segmen: Mikro / Low / Middle; over-quota **Rp 300/transaksi**; tahunan pakai perlakuan sama;
modul PPh Tahunan di-gate: terbuka hanya setelah biaya tahunan dibayar.

### 11a. Struktur harga

**Periodik (per klien/bulan) — kuota:**

| Segmen | Kuota | Harga | COGS penuh | GP |
|---|---|---|---|---|
| Mikro | 100 tx | **Rp 350rb** | 66rb + 3% | 78% |
| Low | 500 tx | **Rp 650rb** | 96rb + 3% | 82% |
| Middle | 2.000 tx | **Rp 1,5jt** | 210rb + 3% | 83% |
| Over-quota | per tx | **Rp 300** | 100 + 3% | 64%* |

**Tahunan (per penugasan, dibayar di muka) — kuota:**

| Segmen | Kuota | Harga | COGS penuh | GP |
|---|---|---|---|---|
| Mikro tahunan | 1.200 tx | **Rp 1,5jt** | 206rb + 3% | 83% |
| Low tahunan | 6.000 tx | **Rp 4jt** | 686rb + 3% | 80% |
| Middle tahunan | 24.000 tx | **Rp 12jt** | 2,51jt + 3% | 76% |
| Over-quota | per tx | **Rp 300** | 100 + 3% | 64%* |

*Over-quota: GP penuh 64% di bawah floor 70%, TAPI biaya tetap (support/storage/infra) sudah tertutup
kuota — yang tersisa hanya AI + payment. **Margin kontribusi 67%** (Rp 200/tx bersih). Posisi sehat:
harga "kelebihan" tidak perlu menanggung biaya tetap. Opsi ketat: Rp 350/tx → GP 71% (masuk band).

### 11b. Analisa GP agregat per skenario

Mix klien asumsi 40% mikro / 40% low / 20% middle → ARPU ±**Rp 700rb/klien/bln**,
COGS rata-rata ±107rb + 3% payment → **GP per klien 81,7%** (dalam band 70–85% ✓).

**Tanpa platform fee, infra Rp 1,5jt/bln ditutup dari margin klien — GP agregat vs jumlah firma:**

| Firma aktif (10 klien/firma) | Share infra/klien | GP agregat |
|---|---|---|
| 1 | 150rb | 53% |
| 3 | 50rb | 66% |
| 5 | 30rb | 70% ✓ |
| 10 | 15rb | 72% |
| 20 | 7,5rb | 74% |

**Kesimpulan jujur**: band 70–85% tercapai saat ≥5 firma aktif. Fase 1–4 firma = GP 53–66%
(di bawah floor) — ini trade-off penghapusan platform fee; mitigasi: **setup fee one-time per firma
(Rp 3jt, dipertahankan)** + terima fase investasi singkat.

### 11c. Paywall modul PPh Tahunan (gating)

- **Mekanisme**: `Client.annualPaidAt` di-set saat invoice tahunan lunas. API SPT 1771 & rekapitulasi
  tahunan **cek di server**: tidak ada `annualPaidAt` valid → 403 + UI menampilkan lock & CTA bayar.
- **Dampak bisnis**:
  - Konversi tinggi: klien yang butuh SPT Tahunan **wajib** ambil paket tahunan (gating keras = 100% konversi kebutuhan itu).
  - Upsell alami: dorong klien bulanan konversi ke tahunan sebelum Jan (reminder Okt–Des + invoice di muka).
  - Mengunci engagement 1 tahun → churn tahunan rendah.
  - Risiko: friction di masa kritis (Jan–Mar) → mitigasi **grace period 14 hari** + notifikasi bertahap (H-60/H-30/H-7) + lock hanya untuk modul SPT, laporan bulanan tetap jalan.
- **Catatan produk**: klien yang HANYA butuh SPT (tanpa bookkeeping) masuk paket Mikro tahunan (entry termurah).

### 11d. Unit economics baru

- ARPU Rp 700rb · COGS rata-rata ±107rb+3% → **GP per klien ±Rp 570rb/bln (81,7%)**
- Break-even infra: ±3 klien; **GP 70% tercapai ≥5 firma**; GP 74% saat 20 firma (tak pernah >85% — harga tetap kompetitif)
- Churn 2,5%/bln → LTV ±Rp 28jt (700rb × 40 bln) · CAC 1,5–3jt → **LTV:CAC 9–18×**
- Potensi: 50 firma × 30 klien = 1.500 klien × Rp 700rb = **±Rp 1,05 M/bln MRR**
- Over-quota: klien over 10–20% → tambahan ±Rp 150–500rb/firma/bln (margin kontribusi 67%)

### 11e. Rekomendasi implementasi (tahap berikutnya)

1. `Client.plan: MIKRO|LOW|MIDDLE` + `billingMode: MONTHLY|ANNUAL` + `annualPaidAt`
2. `UsageMeter` (COUNT JournalLine APPROVED per klien-periode, batch harian)
3. Gate server-side modul SPT 1771 & rekapitulasi tahunan (403 + lock UI + CTA bayar)
4. Invoice: bulanan (paket+over-quota) & tahunan (di muka, kuota tahunan+over-quota)
5. Dashboard firma: MRR + pipeline penugasan terpisah; alert kuota 80%/100%


---

## 12. HARGA FINAL (Revisi Rama 2026-08-13) — Kuota-Only, Tanpa Flat

### 12a. Struktur harga (persis keputusan)

**Periodik (per klien/bulan):**

| Segmen | Kuota | Harga | COGS penuh | GP |
|---|---|---|---|---|
| Mikro | 100 tx | **Rp 300rb** | 63rb + 3% | 76% |
| Low | 500 tx | **Rp 500rb** | 103rb + 3% | 76% |
| Middle | 1.000 tx | **Rp 700rb** | 155rb + 3% | 75% |
| Over-quota | per tx | **Rp 350** | 100 + 3% | 68%* |

**Tahunan (per penugasan, di muka):**

| Segmen | Kuota | Harga | COGS penuh | GP |
|---|---|---|---|---|
| Mikro tahunan | 2.000 tx* | **Rp 1jt** | 261rb + 3% | 71% |
| Low tahunan | 5.000 tx | **Rp 3jt** | 561rb + 3% | 78% |
| Middle tahunan | 15.000 tx | **Rp 5jt** | 1,585jt + 3% | 65%** |
| Over-quota | per tx | **Rp 350** | 100 + 3% | 68%* |

\* Kuota mikro tahunan diasumsikan **2.000 tx** (tidak disebut user; sesuaikan bila perlu).
\** Middle tahunan GP 65% — di bawah floor 70% (diskon volume 333/tx ≈ harga over-quota 350).
Margin kontribusi tetap positif (+3,2jt); terima sebagai paket flagship volume, ATAU kuota diturunkan
ke 12.000 tx (416/tx → GP 71% masuk band).

### 12b. GP agregat & unit economics

Mix 40/40/20 → **ARPU ±Rp 460rb/klien/bln** · COGS rata-rata ±111rb + 3% → **GP per klien 75,8%** (band 70–85% ✓)

**GP agregat vs jumlah firma (10 klien/firma, tanpa platform fee):**

| Firma aktif | GP agregat |
|---|---|
| 1 | 43% |
| 3 | 62% |
| 5 | 69% |
| 6 | **70% ✓** |
| 10 | 73% |
| 20 | 74% |

- Break-even infra: ±5 klien · LTV ±Rp 18,4jt (churn 2,5%) · **LTV:CAC 6–12×**
- Potensi: 50 firma × 30 klien = **±Rp 690jt/bln MRR**
- Insentif tahunan (diskon + kuota lebih besar): Mikro 3,6jt→1jt · Low 6jt→3jt · Middle 8,4jt→5jt
  (vs 12× bulanan) — cash di muka, lock-in 1 tahun, churn turun.

### 12c. Implementasi (menunggu konfirmasi)

`Client.plan: MIKRO|LOW|MIDDLE` + `billingMode: MONTHLY|ANNUAL` + `annualPaidAt` + `UsageMeter`
(COUNT JournalLine APPROVED) + **gate server-side modul SPT 1771** (`annualPaidAt` valid → 403/lock)
+ invoice bulanan (paket + over-quota 350/tx) & tahunan di muka + alert kuota 80%/100%.


---

## 13. FLOOR GP NAIK → 75% (Revisi 2026-08-13)

Keputusan: minimal GP 75% (band 75–85%). Kunci penyesuaian: **asumsi biaya AI per transaksi
diturunkan Rp 100 → Rp 70** (model routing: dokumen bersih → model murah, dokumen sulit → premium;
buffer 2x → 1,3x) + kuota Middle tahunan 15.000 → **14.000 tx** (satu-satunya perubahan kuota).
Harga & kuota lain TETAP seperti keputusan user.

### 13a. Tabel final (proyeksi, AI Rp 70/tx)

**Bulanan:**

| Segmen | Kuota | Harga | COGS | GP |
|---|---|---|---|---|
| Mikro | 100 tx | Rp 300rb | 40rb + 3% | **83,7%** |
| Low | 500 tx | Rp 500rb | 78rb + 3% | **81,4%** |
| Middle | 1.000 tx | Rp 700rb | 125rb + 3% | **79,1%** |
| Over-quota | — | Rp 350/tx | 70 + 3% | **77%** |

**Tahunan:**

| Segmen | Kuota | Harga | COGS | GP |
|---|---|---|---|---|
| Mikro tahunan | 2.000 tx | Rp 1jt | 201rb + 3% | **76,9%** |
| Low tahunan | 5.000 tx | Rp 3jt | 411rb + 3% | **83,3%** |
| Middle tahunan | **14.000 tx** | Rp 5jt | 1,065jt + 3% | **75,7%** |
| Over-quota | — | Rp 350/tx | 70 + 3% | **77%** |

Semua ≥75% ✓ (dan ≤85% ✓). Catatan: over-quota Rp 350 kini sudah ≥75% — tidak perlu naik.

### 13b. Risiko & skenario konservatif (kalau AI aktual tetap Rp 100/tx)

| Produk | GP @70/tx | GP @100/tx |
|---|---|---|
| Mikro bulanan | 83,7% | 76% |
| Low bulanan | 81,4% | 76% |
| Middle bulanan | 79,1% | 75% |
| Mikro tahunan | 76,9% | 71% ✗ |
| Low tahunan | 83,3% | 78% |
| Middle tahunan | 75,7% | 65% ✗ |
| Over-quota | 77% | 68% ✗ |

**Syarat struktur ini sehat: biaya AI rute-rata ≤ Rp 70/tx.** Mitigasi: (1) model routing (murah/sulit),
(2) prompt & caching dokumen berulang, (3) kalau real cost >80/tx → turunkan kuota tahunan
(mikro 1.500 tx / middle 10.000 tx) atau naikkan over-quota ke Rp 400.

### 13c. GP agregat & unit economics (asumsi AI 70/tx)

- ARPU ±Rp 460rb/klien (mix 40/40/20) · COGS rata-rata ±86rb + 3% → **GP per klien 81,3%** ✓
- GP agregat ≥75% tercapai saat **≥6 firma aktif** (10 klien/firma): 1 firma 49% · 3 = 70% · 5 = 75% · 6 = 76% · 10 = 78% · 20 = 80%
- Margin per klien ±Rp 374rb/bln · break-even infra ±4 klien · LTV ±Rp 18,4jt · **LTV:CAC 6–12×**
- Potensi: 50 firma × 30 klien = ±Rp 690jt/bln MRR

### 13d. Implementasi (menunggu OK)

`Client.plan: MIKRO|LOW|MIDDLE` + `billingMode: MONTHLY|ANNUAL` + `annualPaidAt` + `UsageMeter`
(COUNT JournalLine APPROVED) + **gate server-side SPT 1771** (`annualPaidAt` valid) + invoice
bulanan (paket + over-quota 350/tx) & tahunan di muka + alert kuota 80%/100%.
