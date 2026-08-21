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

**Status: ✅ SELESAI (2026-08-11, commit f5a-assets)** — cakupan yang terpasang:
- Schema: `FixedAsset` (metode STRAIGHT_LINE/DECLINING_BALANCE, umur komersial bulan, kelompok fiskal
  K1/K2/K3/K4/BP/BNP, status ACTIVE/DISPOSED) + `DepreciationSchedule` (@@unique assetId+period,
  komersial & fiskal, akumulasi, nilai buku, journalEntryId) + JournalEntry.assetId.
- `src/server/assets.ts` (pure core): parsePeriod/monthsElapsed, FISCAL_GROUPS Pasal 11 (4/8/16/20 th,
  bangunan permanen 20 th / non-permanen 10 th), computeDepreciation (GL: (cost−residual)/umur;
  DB: 2× tarif; fiskal garis lurus tanpa nilai sisa; batas nilai sisa & umur), depreciationJournalLines
  (5-1500 Beban / 1-1500 Akumulasi), createFixedAsset (validasi Indonesia), depreciateClientPeriod
  ($transaction: schedule + jurnal ADJUSTING APPROVED + ActivityLog, idempotent per aset+periode),
  getAssetRegister/getAssetDetail/getAssetReconciliation (beda temporer komersial vs fiskal) + CSV.
- API (OPERATIONAL_ROLES, tenant-scoped): GET/POST `/api/clients/[id]/assets`, GET
  `.../assets/[assetId]`, POST `.../assets/depreciate` {period}, GET `.../assets/report?period=&format=`.
- UI: sidebar + "Aset Tetap"; `/dashboard/assets` — filter klien, periode, tombol "Hitung & Catat
  Penyusutan", form "+ Daftarkan Aset" (metode, umur, kelompok fiskal), register nilai buku, expand
  jadwal per aset, rekonsiliasi fiskal + ↓ CSV.
- Migrasi `f5a_fixed_assets`; seed `scripts/seed-f5a-assets.ts` (2 aset Maju Jaya, idempotent);
  test `tests/assets.test.ts` +11 → **269/269**; tsc 0; lint 0; build OK.
- Live: Mobil Operasional (GL 96 bln, K2) — komersial 3.125.000 vs fiskal 3.333.333,33/bulan; Komputer
  (DB 48 bln, K1) — 2.000.000 vs 1.000.000; 2 jurnal ADJUSTING APPROVED masuk TB (seimbang); rekonsiliasi
  beda temporer −791.667; idempotensi skip; validasi create (biaya ≤ 0, kelompok invalid) tertolak.

### F5B · Core Tax (M9)
- `JournalLine.taxCode` (PPN-IN/OUT, PPh 21/23/4(2)/25, KAP/KJS); generator SPT (1111, PPh 21,
  23/4(2), 1771 + rekonsiliasi fiskal) → CSV/XML skema DJP; review tax specialist; export
  siap upload Core Tax (e-Faktur/e-Bupot). Integrasi PJAP = tahap lanjut (opsional).

**Status: ✅ SELESAI (2026-08-11, commit f5b-core-tax)** — cakupan yang terpasang:
- Schema: `JournalLine.taxCode` (override tax specialist) + `taxBase` (DPP); migrasi `f5b_tax_codes`.
- `src/server/tax.ts` (pure): katalog 18 kode pajak (PPN-OUT 01/02, PPN-IN 01/03 B2/B3, PPh 21
  21-100-01/02/03, PPh 22, PPh 23 103-106, PPh 4(2) 401-404, PPh 25) + ACCOUNT_TAX_MAP (2-2000 →
  PPN-OUT, 1-1400 → PPN-IN, 2-2100/2200/2300/2400/2500 → PPh 21/22/23/4(2)/25; PPN masukan
  "tidak dapat dikreditkan" → B3); inferTaxCode/taxBaseOf; classifyTaxLines → ringkasan per jenis;
  generator CSV skema DJP: buildSpt1111Csv (B1/B2/B3 + ringkasan), buildSpt1771 (laba komersial →
  koreksi fiskal → laba fiskal → PPh 22%, koreksi aset otomatis dari F5A), buildEBupotCsv (KAP/KJS
  PPh 23), buildPPh42Csv, buildPPh21Csv.
- `src/server/tax-report.ts` (wrapper): getTaxLines (jurnal APPROVED/FINALIZED periode, akun pajak),
  getTaxSummary, getAssetTaxCorrection (F5A), getSpt1771Data, setLineTaxCode (override validasi).
- API (OPERATIONAL_ROLES, tenant-scoped): GET `/api/clients/[id]/tax?period=`, PATCH
  `.../tax/lines/[lineId]` {taxCode,taxBase}, GET `.../tax/export?period=&type=spt1111|spt1771|ebupot23|pph42|pph21`.
- UI: sidebar + "Core Tax"; `/dashboard/tax` — kartu ringkasan 8 jenis, review baris pajak
  (DPP override + dropdown kode pajak 18 opsi + simpan), 5 tombol export CSV.
- Test `tests/tax.test.ts` +12 → **281/281** (31 files); tsc 0; lint 0; build OK.
- Live: Maju Jaya 2026-08 — PK 223.850 (DPP 2.035.000), PM 107.690 (B2); SPT 1111 B1/B2;
  SPT 1771 (laba komersial −4.625.000, koreksi aset +791.667); override PPN-OUT-02 tersimpan &
  revert; jurnal APPROVED/FINALIZED saja yang dihitung (DRAFT/TAX_REVIEW tidak).

**Lanjutan ✅ (2026-08-11, commit f5b-xml) — e-Faktur & e-Bupot XML (skema DJP):**
- `src/server/tax-xml.ts` (pure): `normalizeNpwp` (→16 digit), `objectCodeOf` (PPH23-104 → 104),
  `buildEfakturXml` (root `<eFaktur versi="4.0">`, per faktur: NPWP/Nama/Alamat/NoFaktur seri
  `01`+13 digit/TglFaktur/JumlahDpp/JumlahPpn/KeteranganTambahan, escape XML penuh),
  `buildEBupotXml` (root `<eBupot>`, per bukti potong: npwpPemotong/kodeObjekPajak/masa/tahun/
  jumlahPenghasilanBruto/tarif (dari TAX_CODE_CATALOG)/pphYangDipotong/keterangan).
- Export route: tipe baru `efaktur-xml` & `ebupot-xml` (Content-Type application/xml, filename
  `.xml`); taxCode efektif = override ?? inferTaxCode (baris tanpa override tetap masuk).
- UI: 2 tombol export tambahan (↓ e-Faktur XML, ↓ e-Bupot XML).
- Test `tests/tax-xml.test.ts` +8 → **306/306** (34 files); tsc 0; lint 0; build OK.
- Live Maju Jaya 2026-08: e-Faktur 1 faktur (NPWP 0123456789010000, DPP 2.035.000, PPN 223.850);
  e-Bupot 1 bukti potong PPh 23 (kode 104, bruto 10.000.000, tarif 2%, PPh 200.000) dari jurnal
  jasa teknik seed `seed-f5b-pph23.ts`.
- Integrasi API PJAP tetap tahap lanjut (opsional) — export file siap upload sudah lengkap CSV+XML.

### F6A · Bank rekonsiliasi (M6)
- `BankReconciliation` + `ReconciliationItem`; AI saran matching (jumlah/tanggal/lawan);
  aksi match/unmatch; buat jurnal biaya bank; laporan rekonsiliasi.

**Status: ✅ SELESAI (2026-08-11, commit f6a-bank-recon)** — cakupan terpasang:
- Schema: model `BankMutation` (firmId/clientId/period, date, description, amount ±,
  documentId, matchedJournalId, matchStatus UNMATCHED/MATCHED/MANUAL, matchScore); migrasi `f6a_bank_recon`.
- `src/server/recon.ts` (pure): `suggestMatches` — AI matching (jumlah sama ±Rp100 &
  tanggal dekat ±3 hari → skor 1.0; ±15 hari → 0.85; bonus kata kunci transfer/pembayaran/
  penjualan; jurnal yang sudah dipakai tidak dipakai lagi); `buildReconSummary` (saldo bank vs
  buku, outstanding mutasi & jurnal); `reconCsv` (laporan); wrapper DB `importMutations`
  (idempotent), `setMutationMatch` (manual match/lepas, validasi jurnal APPROVED/FINALIZED
  milik klien), `completeReconciliation` (tolak jika masih ada mutasi belum cocok).
- API (OPERATIONAL_ROLES, tenant-scoped): GET `.../recon?period=` (mutasi + jurnal kas 1-1000/
  1-1100 + saran AI + ringkasan), POST `.../recon/mutations` (import, skip duplikat),
  PATCH `.../recon/mutations/[id]` {matchedJournalId|null}, POST `.../recon/complete`,
  GET `.../recon/export?period=&format=csv|json`.
- UI: sidebar + "Rekonsiliasi Bank"; `/dashboard/recon` — 4 kartu ringkasan (mutasi, buku kas,
  outstanding, selisih Bank−Buku), tombol "✨ Terapkan Saran AI", tabel mutasi (status +
  tombol Cocokkan/Lepas), tabel outstanding jurnal kas, ↓ Laporan CSV.
- Test `tests/recon.test.ts` +8 → **289/289** (32 files); tsc 0; lint 0; build OK.
- Live CV Berkah Abadi 2026-07: 8 mutasi (rekening koran) vs 4 jurnal kas; 4 saran AI skor 1.0
  diterapkan → 4/8 match; complete menolak (4 outstanding); CSV berisi ringkasan + outstanding.

### F6B · Laporan custom (M7)
- `JournalLine.dimension` (proyek/channel, jsonb); alur: minta laporan → AI usulkan struktur →
  akuntan setujui → simpan template di ClientProfile.reportTemplates; KB bertambah setelah
  disetujui.

**Status: ✅ SELESAI (2026-08-11, commit f6b-custom-report)** — cakupan terpasang:
- Schema: `JournalLine.dimension Json?` (proyek/channel); migrasi `f6b_dimensions`. Template
  disimpan di `ClientProfile.reportTemplates` (sudah ada sejak F1).
- `src/server/custom-report.ts` (pure): `detectReportKind` (8 jenis: LABA_RUGI, NERACA, ARUS_KAS,
  PENJUALAN, BEBAN, PENDAPATAN_PER_PROYEK, BEBAN_PER_CHANNEL, PENJUALAN_PER_CHANNEL),
  `parseReportPrompt` (ekstrak dimensi & groupBy dari prompt, termasuk nama dalam tanda kutip),
  `suggestReportStructure` (usulan AI deterministik + confidence + alasan), `buildCustomReport`
  (hitung dari jurnal APPROVED/FINALIZED; groupBy proyek/channel; filter dimensi; LABA = pendapatan − beban),
  `customReportCsv`; wrapper DB `saveReportTemplate`/`listReportTemplates`/`deleteReportTemplate`.
- API (OPERATIONAL_ROLES, tenant-scoped): POST `.../custom-reports/suggest` {prompt, period},
  POST `.../custom-reports/templates` (setujui usulan → simpan), GET `.../custom-reports?period=&templateId=&format=csv|json`
  (daftar template / jalankan laporan / unduh CSV), DELETE `.../templates/[templateId]`.
- UI: sidebar + "Laporan Custom AI"; `/dashboard/reports/custom` — form "✨ Minta Laporan"
  (bahasa natural), kartu usulan AI (badge jenis + confidence + alasan + Setujui/Batal),
  daftar template (Jalankan / ↓ CSV / Hapus), tabel hasil + total.
- Test `tests/custom-report.test.ts` +9 → **298/298** (33 files); tsc 0; lint 0; build OK.
- Live Maju Jaya 2026-08: suggest "pendapatan per proyek" → PENDAPATAN_PER_PROYEK 0.88;
  approve → template `tmpl_…`; run → Proyek Alpha 18.500.000 + (tanpa proyek) 500.000 =
  TOTAL 19.000.000 (konsisten SPT 1771); CSV benar; 27 baris jurnal diberi dimensi seed
  (Proyek Alpha/Beta, channel Online/Offline).

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
