# laporan dashboard

> Sumber: skill keuangan-akuntansi-indonesia (06-laporan-dashboard.md). Kategori: Referensi Laporan.


## 06 — Laporan Keuangan & Dashboard (Finance Reports & Dashboards)
Referensi isi & struktur laporan keuangan, laporan manajemen, KPI/metrik dashboard, dan best
practice desain dashboard keuangan.

## Daftar Isi
- Laporan Keuangan Inti
- Laporan Manajemen
- KPI & Metrik Dashboard (dengan formula)
- Best Practice Desain Dashboard
- Struktur Praktis: Dashboard Bulanan & Management Pack

## 1. Laporan Keuangan Inti (Core Financial Statements)
Satu set lengkap (SAK Umum / PSAK 201) = 5 komponen. (Perbedaan per pilar → file 05.)
**1. Laporan Posisi Keuangan (Balance Sheet)** — posisi aset, liabilitas, ekuitas pada satu
titik waktu; Aset = Liabilitas + Ekuitas. Aset lancar/tidak lancar; liabilitas jangka
pendek/panjang; ekuitas (modal disetor, laba ditahan, komponen ekuitas lain).
**2. Laporan Laba Rugi (Income Statement)** — kinerja selama periode:
Pendapatan (Revenue)
− HPP (COGS)
= Laba Kotor (Gross Profit)
− Beban Operasional (penjualan; umum & administrasi)
= Laba Usaha / EBIT (Operating Profit)
± Pendapatan/Beban Non-operasional & Bunga
= Laba Sebelum Pajak (EBT)
− PPh
= Laba Bersih (Net Profit)
Penghasilan komprehensif lain (OCI): mis. selisih revaluasi, selisih kurs entitas asing.
**3. Laporan Arus Kas (Cash Flow)** — 3 aktivitas: Operasi, Investasi, Pendanaan.
- Metode **langsung**: penerimaan/pembayaran kas bruto (lebih informatif; jarang dipakai).
- Metode **tidak langsung** (umum):
Laba Bersih + D&A (non-kas) ± Δ Modal Kerja = Arus Kas Operasi
(Kenaikan aset lancar mengurangi kas; kenaikan liabilitas lancar menambah kas)
**4. Laporan Perubahan Ekuitas** — rekonsiliasi ekuitas: setoran modal, laba/rugi, dividen, OCI.
**5. CALK (Catatan atas Laporan Keuangan)** — kebijakan akuntansi, rincian pos, kontinjensi,
pihak berelasi, peristiwa setelah tanggal pelaporan, pengungkapan wajib SAK.

## 2. Laporan Manajemen (internal; tidak terikat format SAK)
- **Budget vs Actual** — aktual vs anggaran per akun/departemen.
- **Variance Reports** — selisih favorable/unfavorable + analisis penyebab (price/volume variance).
- **AR/AP Aging** — saldo per rentang jatuh tempo.
- **Cash Flow Forecast** — rolling (mis. 13-week) untuk likuiditas.
- **P&L by Department/Product/Project** — profitabilitas per unit analisis.
- **Cost Center Reports** — penyerapan biaya per pusat pertanggungjawaban.
- Lain: margin per produk, capex, headcount & biaya SDM, KPI operasional.

## 3. KPI & Metrik Dashboard (Formula)
**Profitabilitas:**
Revenue Growth %   = (Pendapatan kini − lalu) / lalu × 100%
Gross Margin %     = Laba Kotor / Pendapatan × 100%
Operating Margin % = EBIT / Pendapatan × 100%
Net Margin %       = Laba Bersih / Pendapatan × 100%
EBITDA             = EBIT + Penyusutan + Amortisasi
EBITDA Margin      = EBITDA / Pendapatan × 100%
**Kas / Likuiditas kas (startup):**
Gross Burn = total pengeluaran kas operasional/bulan
Net Burn   = kas keluar − kas masuk/bulan (penurunan kas bersih bulanan)
Runway (bulan) = Saldo Kas / Net Burn per bulan
Operating Cash Flow (OCF) = kas bersih dari operasi
Free Cash Flow (FCF)      = OCF − Capex
**Modal kerja & siklus kas:**
Working Capital = Aset Lancar − Liabilitas Lancar
DSO = (Rata-rata Piutang / Penjualan Kredit) × Jumlah Hari
DPO = (Rata-rata Utang Usaha / HPP) × Jumlah Hari
DIO = (Rata-rata Persediaan / HPP) × Jumlah Hari
Cash Conversion Cycle (CCC) = DIO + DSO − DPO
CCC pendek → kas cepat kembali; CCC negatif (ritel/marketplace) → dibiayai pemasok.
**Likuiditas & leverage:** Current Ratio (sehat ≈1,5–3); Quick Ratio (≥1); DER; Interest Coverage = EBIT/Bunga.
**Return:** ROE = LB/Ekuitas; ROA = LB/Aset; ROIC/ROCE.
**Operasional:**
AR Aging %      = Piutang bucket tertentu / Total Piutang × 100%  (mis. % >90 hari)
Budget Variance % = (Aktual − Anggaran) / Anggaran × 100%
(varians beban + = unfavorable/over budget; varians pendapatan + = favorable)

## 4. Best Practice Desain Dashboard
**Kenali audiens:**
- CFO/Eksekutif → ringkasan strategis (profitabilitas, likuiditas, cash, runway, tren, varians vs budget); sedikit angka kunci + konteks tren.
- Manajer/FP&A/Controller → detail & drill-down (aging per pelanggan, varians per cost center/produk).
- Prinsip: **satu dashboard = satu audiens & satu tujuan**.
**Tata letak & konten:**
- **KPI cards** di atas — 4–8 metrik terpenting (cash, revenue, margin, burn/runway) + nilai aktual, perbandingan (vs target/periode lalu), arah (▲/▼).
- **Tren vs snapshot** — snapshot untuk posisi (cash, current ratio); tren untuk perkembangan (revenue, margin, burn). Beri konteks historis.
- **Drill-down** — "overview first, details on demand" (total → segmen → produk).
- **Piramida informasi** — terpenting kiri-atas (pola baca F/Z).
- **Konsistensi** — format angka/warna/periode seragam; warna fungsional (merah = unfavorable), bukan dekoratif.
**Chart yang tepat:**
- KPI/scorecard tile → satu angka + delta (cash, runway, DSO).
- Line → tren waktu (revenue, margin, cash balance).
- Bar/column → perbandingan kategori (revenue per produk, budget vs actual per de
