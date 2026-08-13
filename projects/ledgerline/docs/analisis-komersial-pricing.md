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
