# Build Plan Praktis — v2 (berdasarkan PRD v2 draft)

> Status: disetujui untuk dieksekusi 2026-08-11. Asumsi keputusan default dari PRD v2 bagian 7
> (belum dikoreksi eksplisit — tandai ulang bila berubah):
> 1. Urutan: F2.5 (siklus akuntansi inti) dulu.
> 2. Pagar aset: "aset untuk akuntan" (register + penyusutan + laporan fiskal, bukan modul manajemen aset klien).
> 3. Dokumen klien (inventory/gaji, dll.) = dokumen sumber → diproses jadi jurnal.
> 4. Core Tax tahap 1: **export file siap upload** (CSV/XML skema DJP); API PJAP = tahap lanjut.
> 5. Laporan keuangan: Neraca + Laba Rugi + Arus Kas dasar; CALK & perubahan ekuitas menyusul.
> 6. Klien lihat jurnal: read-only, default nonaktif, diaktifkan per klien (F3).
> 7. Snapshot laporan: simpan versi per pengiriman (data mentah + render PDF).
> 8. Seed KB: bertahap — 01 (siklus), 04 (pajak), 05 (SAK) lebih dulu.

---

## Prinsip Eksekusi

- **Satu milestone = satu alur utuh**: schema → server logic → API route → UI → test → verifikasi live (browser + psql). Test harus tetap hijau di setiap akhir milestone.
- **Setiap milestone = 1 commit** (atau beberapa commit kecil dengan 1 pesan utama).
- Verifikasi live memakai browser panel + psql (pola yang sudah jalan).
- Jangan menyentuh pagar anti-ERP.

## Peta Milestone

| # | Milestone | PRD item | Deliverable utama | Estimasi task |
|---|---|---|---|---|
| 1 | **F2.5A · Jurnal manual** | M5 | Entry jurnal manual + jurnal penyesuaian (UI + API + validasi balance), `journalType`, periode | ~8 |
| 2 | **F2.5B · Edit saat review + feedback KB** | M1, EN-03 | Panel review editable (akun/nominal/keterangan), audit trail revisi, simpan koreksi → data belajar KB | ~10 |
| 3 | **F2.5C · Kategori dokumen 9 jenis** | M2 | Ekspansi `DocumentType`, mapping jenis→jenis jurnal, update upload form + seed | ~5 |
| 4 | **F2.5D · Trial Balance interaktif** | M3 | Agregasi saldo per akun/periode, tabel spreadsheet, filter klien+periode, indikator kewajaran, comparatif | ~8 |
| 5 | **F2.5E · Buku Besar + reclass + kunci periode** | M4, A5 | Drill-down akun→buku besar, reclass/edit jurnal, status `FINALIZED` + `FiscalPeriod` lock partner, penyesuaian pasca-lock | ~10 |
| 6 | **KB Seed (paralel)** | PRD §4 | Seed KnowledgeItem dari skill keuangan-akuntansi-indonesia (01/04/05 dulu), kategori baru | ~4 |
| 7 | **F3 · Portal Klien dalam** | EN-08, K1–K6 | Status dokumen proaktif, laporan self-service + versi (A1), jurnal read-only opsional, notifikasi | ~10 |
| 8 | **F5A · Aset tetap** | M8 | Register aset, penyusutan komersial (PSAK 216) + fiskal (Pasal 11), jurnal otomatis, laporan jadwal & nilai buku, rekonsiliasi fiskal | ~12 |
| 9 | **F5B · Core Tax export** | M9 | Kode pajak per baris jurnal, generator SPT 1111/1771/PPh 21/23/4(2), e-Faktur/e-Bupot CSV/XML, review tax → export | ~12 |
| 10 | **F6A · Bank rekonsiliasi** | M6 | Modul rekonsiliasi, AI matching suggestion, outstanding items, laporan | ~10 |
| 11 | **F6B · Laporan custom AI** | M7 | Dimensi (proyek/channel) di baris jurnal, alur minta laporan → AI usul → setujui → template, ekspansi KB | ~10 |

**Urutan logika:** 1–5 membangun siklus akuntansi yang benar (sumber kebenaran) → 6 memperkaya AI
→ 7 menampilkan hasil ke klien → 8–9 kepatuhan pajak dari data yang sudah benar → 10–11 laporan
lanjutan. Milestone 6 bisa jalan paralel dengan 1–5.

## Rincian per Milestone

### F2.5A · Jurnal manual (M5) — mulai di sini
- **Schema:** `JournalEntry.journalType` (MANUAL | ADJUSTING | AI — default AI untuk hasil pipeline);
  `FiscalPeriod` (id, firmId, clientId, period "2026-07", status OPEN/CLOSED) — fondasi M4/M5.
- **Server:** `src/server/manual-journal.ts` — validasi balance (debit=credit), akun harus ada di
  COA standar/klien, kode pajak opsional, RBAC (Senior/Partner + Admin; Junior read).
- **API:** `POST /api/journals/manual` (withTenantApi + requireRoleApi), `GET /api/journals/manual?clientId&period`.
- **UI:** halaman "Jurnal Manual" (daftar + form entry baris dinamis: akun/debit/kredit/ref PSAK),
  flash validasi.
- **Test:** balance validation, RBAC, tenant scope, journalType tercatat. Verifikasi live browser.

### F2.5B · Edit jurnal saat review (M1)
- Panel review (queues) dapat **mengedit baris jurnal** sebelum approve; simpan = revisi draft
  (status tetap di stage yang sama), ActivityLog mencatat `JOURNAL_EDITED` dengan diff.
- **Feedback loop:** setiap koreksi reviewer tersimpan ke tabel `JournalCorrection`
  (journalId, userId, field, before, after) → sumber data belajar KB (EN-03). Dashboard insight
  "akun paling sering dikoreksi" (A6) di quality page.

### F2.5C · Kategori dokumen (M2)
- `DocumentType` ekspansi: FINANCIAL_STATEMENT, GENERAL_JOURNAL, BANK_STATEMENT, PAYABLES_REPORT,
  RECEIVABLES_REPORT, INVENTORY_REPORT, PAYROLL_REPORT, TAX_REPORT, OTHER (backward-compat: INVOICE,
  RECEIPT dipetakan).
- Mapping jenis→jenis jurnal di rule-engine (`src/ai/`): payroll → beban gaji + PPh 21; tax →
  PPN/PPh; dst. Update upload form + portal + seed.

### F2.5D · Trial Balance (M3)
- `src/server/trial-balance.ts`: agregasi JournalLine (APPROVED + FINALIZED + MANUAL/ADJUSTING)
  per akun per periode → saldo debet/kredit, net. Indikator kewajaran (aset kredit, piutang negatif).
- Halaman `/dashboard/reports/trial-balance`: tabel (pakai komponen Table), filter klien+periode,
  comparatif bulan lalu, tombol ekspor CSV/XLSX (reuse reports.ts).

### F2.5E · Buku besar + kunci (M4)
- Klik akun di TB → `/dashboard/reports/ledger?account=...`: seluruh jurnal akun (tanggal, ref,
  debet, kredit, saldo berjalan).
- Reclass: edit jurnal APPROVED sebelum lock (khusus Senior/Partner, audit trail).
- Lock: Partner set `FiscalPeriod.status=CLOSED`; setelah closed → edit langsung dilarang,
  hanya jurnal ADJUSTING yang bisa masuk (F2.5A journalType).
- Status baru `JournalStatus.FINALIZED` saat laporan disetujui partner (pintu ke A1 snapshot).

### KB Seed (paralel)
- Script `scripts/seed-knowledge-skill.ts`: baca 6 referensi skill → KnowledgeItem
  (kategori ACCOUNTING_IND / TAX / SAK / REPORTING, status DRAFT → approve oleh admin).
- Tahap 1: 01, 04, 05. Tahap 2: 02, 03, 06.

### F3 · Portal Klien dalam (EN-08 + K1–K6)
- Status dokumen berjenjang + estimasi ("diterima → diproses → review → selesai"), notifikasi
  proaktif (outbox), laporan self-service + **versi snapshot** (A1), opsi lihat jurnal read-only
  per klien (K3), bahasa sederhana, pernyataan privasi (K6).

**Status: ✅ SELESAI (2026-08-11, commit f3-portal)** — cakupan yang terpasang:
- **K1/EN-08** — status berjenjang di portal: timeline "Diterima → Diproses AI → Selesai"
  + label review akun termuda (API `GET /api/portal/[token]/timeline`, render server-side).
- **K2** — dedupe kirim ulang dokumen: cek `fileHash` milik klien → 409
  "sudah pernah dikirim" (upload route portal).
- **K3** — jurnal read-only + bahasa sederhana: `src/server/simple-explain.ts` (pure,
  klasifikasi 1-5 → frase aset/utang/pendapatan/beban), API
  `GET /api/portal/[token]/journals`, UI "Transaksi Saya" + "Lihat penjelasan lengkap".
- **K4** — `ClientNotification` (REPORT_READY/DOCUMENT_PROCESSED/EXCEPTION/REMINDER),
  dibuat otomatis saat lock periode; API list + mark-read; UI notifikasi + badge unread.
- **K5/A1** — `ReportSnapshot` (clientId+period+type+version @@unique): snapshot
  TRIAL_BALANCE dibuat saat periode dikunci (lock route), unduh CSV/XLSX kapan saja
  (`GET /api/portal/[token]/snapshots`), UI "Laporan & Versi".
- **K6** — pernyataan privasi statis (enkripsi AES-256-GCM + TLS, tanpa pelatihan lintas firma,
  token kedaluwarsa).
- Migrasi `f3_portal_snapshot_notif`; test `simple-explain` +5 → **253/253**; tsc 0; lint 0; build OK.
- Live: PT Maju Jaya — 3 jurnal read-only, timeline 1 dokumen, snapshot TB v1 (2026-08),
  2 notifikasi unread, dedupe 409 terverifikasi.

### F5A · Aset tetap (M8)
- `FixedAsset` + `DepreciationSchedule`: metode garis lurus/saldo menurun, umur komersial (PSAK 216)
  & kelompok fiskal (Pasal 11: 4/8/16/20 th), jurnal penyusutan otomatis per periode (ADJUSTING),
  laporan register/jadwal/nilai buku, rekonsiliasi fiskal.

### F5B · Core Tax (M9)
- `JournalLine.taxCode` (PPN-IN/OUT, PPh 21/23/4(2)/25, KAP/KJS); generator SPT (1111, PPh 21,
  23/4(2), 1771 + rekonsiliasi fiskal) → CSV/XML skema DJP; review tax specialist; export
  siap upload Core Tax (e-Faktur/e-Bupot). Integrasi PJAP = tahap lanjut (opsional).

### F6A · Bank rekonsiliasi (M6)
- `BankReconciliation` + `ReconciliationItem`; AI saran matching (jumlah/tanggal/lawan);
  aksi match/unmatch; buat jurnal biaya bank; laporan rekonsiliasi.

### F6B · Laporan custom (M7)
- `JournalLine.dimension` (proyek/channel, jsonb); alur: minta laporan → AI usulkan struktur →
  akuntan setujui → simpan template di ClientProfile.reportTemplates; KB bertambah setelah
  disetujui.

---

## Kriteria selesai per milestone
- Test hijau (unit + component), lint 0, tsc clean, build OK.
- Verifikasi live di browser (alur utama) + cek DB via psql.
- TECHDEBT/PRD item dicentang; docs diperbarui.

## Catatan risiko
- **F2.5B & F2.5E** menyentuh state machine review — lakukan hati-hati, pertahankan invariant
  (SLA events, outbox, activity log tetap tercatat; pitfall 37/38 diingat).
- **Enum ekspansi (M2)** harus backward-compatible dengan seed & data lama.
- **F5B** butuh akurasi skema DJP — seed KB 04 (pajak) jadi acuan; verifikasi format ke sumber
  resmi sebelum final.
