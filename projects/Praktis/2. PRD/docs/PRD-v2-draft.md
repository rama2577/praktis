# PRD Praktis — Revisi v2 (DRAFT untuk dikoreksi)

> **Status: DRAFT — belum final.** Disusun 2026-08-11 dari: masukan teman (9 poin), masukan
> pemilik produk, hasil analisis gap vs implementasi saat ini, dan knowledge base baru
> `keuangan-akuntansi-indonesia` (6 referensi akuntansi & pajak Indonesia).
> Koreksi/konfirmasi ditandai **[KEPUTUSAN]** di bagian akhir.

---

## 1. Konteks & Perubahan Posisi

**Sebelum (spec v0.1):** Praktis = pipeline AI bookkeeping: dokumen → OCR → draft jurnal →
review 4 mata → approval. Fokus: menghilangkan ketikan, bukan membangun siklus akuntansi.

**Sesudah (arah v2):** Praktis = **platform operasional firma akuntan yang mencakup siklus
akuntansi lengkap + kepatuhan pajak Indonesia**:
dokumen → jurnal → **trial balance → buku besar → reclass → laporan keuangan (PSAK) →
tutup buku/kunci periode → jurnal penyesuaian → laporan pajak siap Core Tax**.

Visi satu kalimat:
> *"Praktis mengubah junior accountant dari juru ketik menjadi reviewer, dan menjadikan firma
> akuntan mampu melayani lebih banyak klien dengan laporan yang benar, tepat waktu, dan siap pajak."*

**Pagar anti-ERP tetap berlaku:** Praktis = platform operasional firma. Dokumen sumber klien
(laporan inventory, gaji, dll.) diterima & diproses menjadi jurnal — **bukan** membangun modul
bisnis klien (inventory management, payroll system, CRM, HR, GL penuh untuk dipakai klien).

---

## 2. Fitur Baru — Masukan Teman (M1–M9)

### M1 · Revisi jurnal saat review + umpan balik ke Knowledge Base
- Reviewer (Junior/Senior) dapat **mengubah isi jurnal** (akun, debit/kredit, keterangan) langsung
  dari panel review; hasil revisi menjadi dasar laporan.
- Setiap perubahan tercatat (audit trail: siapa, dari → ke, kapan) di ActivityLog.
- **Koreksi reviewer tersimpan sebagai data umpan balik** → dipelajari KB klien (feedback loop,
  menggantikan EN-03 yang masih terbuka).
- Aturan peran: batas edit per stage; revisi otomatis menandai jurnal "perlu perhatian".

### M2 · Kategori dokumen upload diperluas (9 jenis)
- Jenis dokumen: **Laporan Keuangan · General Journal · Rekening Koran/Bank/Kas · Laporan
  Hutang/Pembelian · Laporan Piutang/Penjualan · Laporan Inventory · Laporan Gaji · Laporan
  Pajak · Lain-lain** (menggantikan enum 3: INVOICE/BANK_STATEMENT/RECEIPT).
- **Mapping jenis dokumen → jenis jurnal** yang dihasilkan (laporan gaji → beban gaji + utang
  PPh 21; laporan pajak → jurnal PPN/PPh; dll.) — memperkuat akurasi AI.

### M3 · Trial Balance interaktif (neraca percobaan)
- Setelah jurnal disetujui: tampilan **spreadsheet trial balance** per klien & periode
  (daftar akun + saldo debet/kredit).
- Review kewajaran: indikator saldo tidak wajar (aset kredit, piutang negatif), filter periode,
  **comparatif vs bulan lalu**, ekspor.
- Menjadi gerbang sebelum penyusunan laporan keuangan PSAK.

### M4 · Drill-down Buku Besar + reclass + kunci partner
- Dari trial balance, klik akun → **buku besar** (seluruh jurnal akun tsb per periode).
- Jurnal dapat **diperbaiki/reclass** selama periode belum dikunci.
- Setelah **partner mengunci laporan (final)** → edit langsung dilarang; perbaikan hanya lewat
  **jurnal penyesuaian**.
- Status baru di model: `FINALIZED`/`LOCKED` + konsep **periode tutup buku** per klien.

### M5 · Modul jurnal manual (entry + jurnal penyesuaian)
- Input jurnal langsung oleh akuntan: jurnal yang kurang/penyesuaian; validasi debit = kredit,
  pilih klien/periode, referensi PSAK, kode pajak.
- Fondasi M4 & M6; model DB sudah siap (`createdByAi=false`).

### M6 · Bank rekonsiliasi
- Rekening koran **diadu dengan jurnal kas/bank**; **AI memberi saran pasangan transaksi**
  (matching: jumlah, tanggal, lawan), akuntan yang memutuskan.
- Sisa tak-match = item rekonsiliasi (outstanding); dukung jurnal biaya admin bank; laporan
  rekonsiliasi per periode.

### M7 · Laporan custom via AI + perluasan KB
- Klien minta laporan custom (laba rugi per proyek/channel, cost accounting, dll.) → AI usulkan
  **definisi & struktur laporan** → akuntan setujui → tersimpan sebagai template (di
  ClientProfile.reportTemplates).
- Prasyarat: **tagging dimensi** (proyek/channel) pada baris jurnal; AI memperluas KB dengan
  pengetahuan baru setelah disetujui.

### M8 · Laporan Aset Tetap (fixed assets) — [KEPUTUSAN pagar]
- Versi **"aset untuk akuntan"**: register aset klien (perolehan, umur, metode, nilai buku),
  kalkulasi **penyusutan komersial (PSAK 216)** & **fiskal (Pasal 11, kelompok harta)**,
  jurnal penyesuaian otomatis, laporan jadwal penyusutan & nilai buku, pelepasan aset.
- **Rekonsiliasi fiskal penyusutan** (beda komersial vs fiskal) → bahan SPT 1771.
- Bukan modul manajemen aset untuk klien (di luar pagar).

### M9 · Output siap Core Tax (CTAS DJP)
- **Kode pajak per baris jurnal** (PPN masukan/keluaran, PPh 21/23/4(2)/25, KAP/KJS) — prasyarat.
- Generator draft SPT dari jurnal: **SPT Masa PPN 1111, PPh 21/23/4(2), e-Faktur, e-Bupot,
  SPT Tahunan 1771** (format CSV/XML skema DJP) → review tax specialist → export/upload ke
  Core Tax (jalur resmi PJAP dengan sertifikat digital; konektor, bukan modul pajak).
- Rekonsiliasi fiskal (beda tetap/beda waktu) sebagai lampiran 1771.

---

## 3. Masukan Pemilik Produk (dari sesi akuntan & klien) yang Diangkat

**Sebagai akuntan:**
- A1 · **Snapshot laporan terkirim**: laporan yang sudah dikirim klien beku (versi tersimpan);
  jurnal penyesuaian berikutnya tidak mengubah laporan historis.
- A2 · Validasi otomatis saat edit/reclass (debit=kredit, wajar-tidak-wajar) dengan saran AI.
- A3 · **Kode pajak per baris** (mendukung M9).
- A4 · **Working paper/lampiran** per jurnal (file pendukung menempel).
- A5 · Alur tutup buku bertahap: draf → final → terkunci; laporan comparatif.
- A6 · Insight kualitas: akun/jurnal yang paling sering dikoreksi → arah perbaikan KB.

**Sebagai klien:**
- K1 · Status dokumen yang jelas & proaktif ("sampai mana?") — portal diperdalam (EN-08).
- K2 · Tidak kirim ulang dokumen yang sama (KB per klien).
- K3 · Transparansi terbatas: lihat jurnal transaksi read-only + penjelasan bahasa sederhana.
- K4 · Notifikasi proaktif (dokumen kurang, angka janggal, tenggat).
- K5 · Riwayat versi laporan bisa diunduh kapan saja.
- K6 · Pernyataan privasi eksplisit (enkripsi, tidak dipakai melatih model lintas firma).

---

## 4. Knowledge Base → Integrasi ke Praktis

- Skill `keuangan-akuntansi-indonesia` (6 referensi: prinsip & siklus, biaya, manajemen
  keuangan, pajak 2025–2026, SAK/PSAK, laporan & dashboard) diadopsi sebagai **konten awal
  Knowledge Platform** (EN-01) — disimpan sebagai KnowledgeItem versioned, kategori sesuai.
- Peran: (a) prompt drafting AI lebih akurat (PSAK 115/202/216/212, tarif PPN 11% efektif,
  PPh, penyusutan fiskal); (b) basis jawaban insight/wawasan AI untuk portal; (c) bahan
  pembuatan laporan & SPT.
- [KEPUTUSAN] Prioritas seeding: 01 (siklus), 04 (pajak), 05 (SAK) dulu; 02/03/06 menyusul.

---

## 5. Roadmap Revisi (draft)

| Fase | Fokus | Item |
|---|---|---|
| **F0 ✅** | Security & CI quick wins | TD-01/02/09, SE-01/06 awal, HSTS |
| **F1 ✅** | Engineering foundation | EN-04 (tenant), EN-05 (event bus), coverage gate, component tests |
| **F2 🔄** | Knowledge Platform | EN-01 KB versioned ✅, EN-02 profil klien ✅, EN-03 feedback loop (→ M1) |
| **F2.5 (baru)** | **Siklus akuntansi inti** | **M5 jurnal manual** → **M1 edit saat review + feedback KB** → **M2 kategori dokumen** → **M3 trial balance** → **M4 buku besar + reclass + kunci periode** |
| **F3** | Portal Klien | EN-08 + K1–K6 |
| **F4** | Skala & monetisasi | EN-09 konektor, EN-11 pricing, TD-14 |
| **F5 (baru)** | **Aset & kepatuhan pajak** | **M8 aset tetap** → **M9 Core Tax** (kode pajak per baris → generator SPT/e-Faktur → rekonsiliasi fiskal → PJAP) |
| **F6 (baru)** | **Laporan cerdas** | **M6 bank rekonsiliasi** → **M7 laporan custom AI + ekspansi KB** |

*Urutan masih bisa digeser — menunggu konfirmasi prioritas (bagian 7).*

---

## 6. Dampak ke Arsitektur (ringkas)

| Area | Perubahan |
|---|---|
| Schema | `DocumentType` ekspansi (M2); `JournalLine` + kode pajak & dimensi (M7/M9); status jurnal `FINALIZED` + `PeriodLock`/`FiscalPeriod` (M4/M5); model `FixedAsset` + jadwal penyusutan (M8); model rekonsiliasi bank (M6); `ReportVersion`/snapshot (A1) |
| Pipeline | Mapping jenis dokumen → jenis jurnal (M2); edit/reclass di state machine (M1/M4); jurnal penyesuaian pasca-lock (M5) |
| AI | Umpan balik koreksi → KB (M1/EN-03); saran matching bank (M6); saran custom report (M7); draft SPT (M9) |
| UI | Panel review editable (M1); halaman Trial Balance + Buku Besar (M3/M4); modul jurnal manual (M5); rekonsiliasi (M6); register aset (M8); generator SPT (M9) |
| KB | Seed konten dari skill keuangan-akuntansi-indonesia; kategori baru: pajak, aset, laporan |

---

## 7. Pertanyaan Terbuka — [KEPUTUSAN] yang perlu dikoreksi/diputuskan

1. **Urutan fase**: mulai dari F2.5 siklus akuntansi (jurnal manual → edit review → TB → buku
   besar) atau langsung F5 (aset/pajak)? Rekomendasi: F2.5 dulu (fondasi).
2. **Pagar aset (M8)**: setuju versi "aset untuk akuntan" (bukan modul manajemen aset klien)?
3. **Pagar dokumen klien (M2)**: konfirmasi laporan inventory/gaji klien diterima sebagai
   dokumen sumber (diproses jadi jurnal), bukan modul bisnis.
4. **Integrasi Core Tax (M9)**: tahap 1 cukup **export file siap upload** (CSV/XML), atau sudah
   harus **API via PJAP** (butuh kerja sama resmi & sertifikat)?
5. **Cakupan laporan keuangan (M3/M4)**: cukup **Neraca + Laba Rugi + Arus Kas** dasar, atau
   termasuk CALK & laporan perubahan ekuitas (SAK EP/Umum)?
6. **Klien melihat jurnal (K3)**: baca-only untuk semua klien, atau opsi per klien?
7. **Snapshot laporan (A1)**: versi per pengiriman — simpan PDF snapshot + data mentah versi?
8. **Konten KB**: seed dari skill (6 referensi) langsung diaktifkan semua, atau bertahap
   (01/04/05 dulu)?

---

*Draft ini akan difinalisasi setelah koreksi Anda. Setelah final, diturunkan menjadi tugas
implementasi per fase di TECHDEBT & tasks/.*
