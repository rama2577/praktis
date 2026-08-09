# Tech Debt & Enhancement Register — Praktis (LedgerLine)

> **Dokumen master** — gabungan tech debt + masukan dewan ahli + masukan pemilik produk + security/code quality.
> Baseline: HEAD `38cc561` (15 commit, 14 task) · 89/89 test · lint+build green · audit 2026-08-09.
> **Prinsip pagar (anti-ERP):** Praktis = platform operasional firma akuntan (AI bookkeeping).
> Tiap item baru harus lulus uji: *"apakah mempercepat review/laporan atau memangkas overhead?"* —
> kalau tidak → tolak. **JANGAN bangun modul bisnis klien** (inventory, payroll, CRM, HR, GL penuh klien).

**Legend:** 🔴 prioritas tinggi · 🟠 sedang · 🟡 ringan · EN = enhancement · SE = security · SQ = code quality
**Cara pakai:** centang checklist, update tanggal; item selesai → pindah ke "✅ Selesai".

---

# Bagian 1 · Tech Debt (TD)

## 🔴 Prioritas tinggi

### TD-01 · Route `debug-login` tanpa gate lingkungan  ✅ (F0, 2026-08-09)
- **Kondisi:** folder `src/app/api/debug-login/` kosong (route tidak pernah ter-commit); folder dihapus, 0 referensi tersisa di repo.
- [x] Hapus/guard route · [x] Test auth tetap hijau · [x] Verifikasi mode produksi

### TD-02 · Kredensial demo hardcoded di scripts E2E  ✅ (F0, 2026-08-09)
- **Kondisi lama:** password literal di `scripts/e2e-review.ts` & `e2e-upload.ts` (pernah kena masking tooling).
- **Fix:** `const PASSWORD = process.env.TEST_PASSWORD ?? "password123";` di kedua script; `TEST_PASSWORD` ditambahkan di env CI.
- [x] Refactor ke env · [x] Validasi · [x] Verifikasi kedua script (E2E hijau)

### TD-03 · Redis non-produksi, konfigurasi tidak versi-controlled
- **Kondisi:** Homebrew + `redis.conf` edit manual; modul nonaktif; tanpa TLS.
- **Rekomendasi:** managed Redis + TLS; konfigurasi ke IaC.
- [ ] Pilih provider · [ ] IaC · [ ] Update README

### TD-04 · Storage dokumen = filesystem lokal
- **Kondisi:** `src/lib/storage.ts` file di disk lokal; tanpa backup policy.
- **Rekomendasi:** object storage (S3/R2/MinIO) private + enkripsi tetap di atasnya + backup.
- [ ] Abstraksi provider · [ ] Implementasi · [ ] Backup/restore policy

### TD-05 · Manajemen kunci enkripsi manual
- **Kondisi:** `STORAGE_ENCRYPTION_KEY` env; tanpa rotasi/KMS.
- **Rekomendasi:** secret manager + key versioning + prosedur recovery.
- [ ] Pilih secret manager · [ ] Key versions · [ ] Prosedur rotasi

## 🟠 Sedang

- **TD-06 · Path LLM belum teruji end-to-end** → **engine GLM dipasang (F1)**: default **GLM-4-Flash** (teks, gratis) + **GLM-4V-Flash** (OCR, gratis) + glm-4.6 retry; fallback ganda di `chatJsonWithFallback`; unit test `tests/llm.test.ts` (11 kasus, fetch di-mock). Sisa: integration test dengan key nyata + smoke vision JPG (F2). [x] model routing · [x] fallback · [x] unit test · [ ] test key nyata (F2)
- **TD-07 · Knowledge base statis** (13 referensi hardcoded) → **digantikan EN-01** (KB versioned & updatable). [ ]
- **TD-08 · Parsing dokumen terbatas** (pdf-parse teks-only, belum OCR) → evaluasi OCR layer. [ ]
- **TD-09 · Isolasi tenant belum teruji E2E** → **test dibuat & LULUS (F0)**: `scripts/e2e-isolation.ts` (8/8 asersi — clients, queues, dashboard, upload lintas-firma ditolak 400, exceptions, PATCH langsung 404). Middleware tenant-scoped (EN-04) tetap di F1. [x] test isolasi · [ ] middleware EN-04 · [ ] masuk CI (step sudah ditambahkan di ci.yml)

## 🟡 Ringan

- **TD-10 · CI belum pernah benar-benar jalan** (belum push ke GitHub) → workflow diperbarui (TEST_PASSWORD env, step audit, step e2e-isolation) & semua langkah terverifikasi lokal; **butuh push ke GitHub** untuk eksekusi nyata. [x] verifikasi lokal · [ ] push & hijau di GitHub
- **TD-11 · Tooling deck nyasar di repo app** (`screenshot-mockups.ts`, `playwright.config.ts`) → pindah ke `projects/praktis-deck`. [ ]
- **TD-12 · Playwright hardcode `channel: "chrome"`** → dokumentasikan/pinned headless shell. [ ]
- **TD-13 · Coverage UI = 0** → **component tests mulai (F1)**: `tests/status-badge.test.tsx` (5) + `tests/empty-state.test.tsx` (5) — total test 89 → **112**. Lanjutan: queue-list, kpi-cards, dashboard-panels → F2. [x] status-badge · [x] empty-state · [ ] queue-list/kpi-cards (F2)
- **TD-14 · Alert SLA breach internal saja** → email/SMTP/Telegram (post-launch DoD). [ ]
- **TD-15 · Tidak ada backup/restore strategy** (lihat TD-04). [ ]
- **TD-16 · Seed akun demo `password123`** → ganti/disable sebelum produksi. [ ]
- **TD-17 · Security headers belum lengkap** → tambah `X-Permitted-Cross-Domain-Policies: none` + `Strict-Transport-Security` (HSTS, hanya NODE_ENV=production) — F0 ✅; **CSP penuh belum** (butuh nonce, risiko break) → lanjutkan di F1. [x] HSTS + X-PCDP · [ ] CSP

---

# Bagian 2 · Enhancement — masukan dewan ahli (EN)

## EN-01 · Knowledge Platform (masukan pemilik produk — PRIORITAS)
Knowledge base bukan sekadar referensi statis — harus jadi **sistem pengetahuan yang hidup**:
- **Konten versioned & tanggal efektif:** COA standar Indonesia, accounting treatment (PSAK 71/72/73, PPN 11%, PPh 21/23/4(2)), report modeling (template laba rugi/neraca/arus kas), analyst modeling (rasio & analisa otomatis).
- **Workflow approval:** perubahan KB oleh Senior/Partner dengan audit trail; tarif pajak berubah → update terjadwal dengan effective date (jurnal lama tetap valid, jurnal baru pakai aturan baru).
- **Bukan hardcoded:** KB sebagai data ter-versioning + API/UI admin untuk update (menggantikan TD-07).
- [ ] Model data KB (version, effectiveDate, category, content, approvedBy) · [ ] UI admin KB · [ ] Audit trail perubahan · [ ] Migrasi 13 referensi

## EN-02 · Pengenalan Profil Klien (masukan pemilik produk — PRIORITAS)
Klien yang sudah punya **laporan keuangan baku + COA baku** harus langsung dikenali AI saat upload:
- **Client Profile sebagai entitas:** mapping COA klien → COA standar, format laporan klien, aturan spesifik klien (kebijakan akun, penyusutan, dll).
- **Onboarding cepat:** upload 1–2 periode historis → AI belajar mapping → transaksi baru langsung terklasifikasi benar.
- **Dampak:** exception rate turun, first-pass rate naik, setup klien baru < 15 menit.
- [ ] Model ClientProfile (coaMapping, reportTemplates, rules) · [ ] Flow "upload historis → belajar mapping" · [ ] Review mapping oleh senior · [ ] Metrik: first-pass rate naik

## EN-03 · Feedback loop AI (Senior Accountant & Data Engineering)
- Rekam approve/reject/exception + koreksi user → dataset latih rule/LLM ("human-in-the-loop = data flywheel").
- Explainability: "kenapa confidence rendah?" — alasan user tersimpan sebagai data.
- [ ] Record koreksi user · [ ] Dashboard insight dari koreksi · [ ] Pipeline update rule dari pola

## EN-04 · Multi-tenancy via middleware (Full Stack)  ✅ fase 1 (F1)
- Tenant context (Prisma extension) menggantikan `firmId` manual per query → hilangkan kelas bug "lupa filter". Menyelesaikan TD-09 secara struktural.
- **F1 ✅:** `src/lib/tenant.ts` (AsyncLocalStorage + `applyTenantFilter` murni) + extension di `src/lib/db.ts` — query di dalam `withTenant()` otomatis di-scope (model ber-firmId + ReviewTask via relasi; User/Firm tidak). Unit test `tests/tenant.test.ts` (8 kasus). E2E isolasi tetap 8/8 dengan extension aktif.
- **Fase 2 (F2):** wrap semua route/server module dengan `withTenant` — bersamaan portal klien.
- [x] extension + ALS · [x] unit test · [ ] wrap route (F2)

## EN-05 · Event-driven + outbox (Full Stack)  ✅ fase 1 (F1)
- Event jurnal (APPROVED, EXCEPTION, SLA_BREACH, REPORT_READY) → notifikasi klien/firma; outbox pattern untuk reliabilitas; dasar webhook & email (TD-14).
- **F1 ✅:** `src/lib/events.ts` (typed event bus; error listener tidak memblokir) + hook di `journal-machine.ts` → emit `journalApproved`, `journalException`, `slaBreach`. Unit test `tests/events.test.ts`.
- **Fase 2 (F2):** outbox persisten (tabel DB) + consumer + webhook/email (menyambung TD-14).
- [x] event bus · [x] hook transisi · [ ] outbox + notifikasi (F2)

## EN-06 · Review UX < 3 klik (UX Engineer)
- Keyboard-first approve/reject, batch approve hanya confidence tinggi, exception satu layar (dokumen + draft + aturan), shortcut untuk power user — mendukung klaim "5 dtk/jurnal".
- [ ] Keyboard shortcuts · [ ] Batch approve (confidence gate) · [ ] Exception one-screen

## EN-07 · Design system formal (UI Designer)
- Token navy/gold → library komponen (table, badge, status, empty/error/loading); portal klien konsisten tanpa desain ulang; dashboard per role (junior=antrian, senior=exception, partner=KPI).
- [ ] Token & komponen library · [ ] Pola per role

## EN-08 · Portal Klien (Business Dev + UX + PM — milestone utama)
- Persona klien ≠ akuntan: bahasa sederhana, mobile-first, onboarding < 2 menit, notifikasi, laporan self-service + analisa + wawasan AI (digital imaging sudah siap: images/11–16).
- **Prasyarat:** TD-09/EN-04 (isolasi tenant) selesai.
- [ ] Desain persona klien · [ ] Auth klien + RBAC · [ ] Upload mandiri · [ ] Laporan self-service · [ ] Wawasan AI + disclaimer

## EN-09 · Konektor & standar data (ERP Consultant)
- Impor/ekspor standar: XLSX template, CSV bank (BCA/Mandiri/BRI), CSV E-Faktur; export laporan (PDF/XLSX); integrasi keluar ke ekosistem (Jurnal.id/Mekari/Accurate) — **konektor, bukan modul**.
- Template per jenis usaha (retail/jasa/dagang): setup klien < 15 menit (mendukung EN-02).
- [ ] Format impor bank · [ ] Template jenis usaha · [ ] Export standar

## EN-10 · Kualitas & monitoring proses (Business Process + Data)
- Data completeness score per klien, waktu tunggu klien, cycle time per tahap; klasifikasi exception (kurang/tak terbaca/aturan baru) → feed KB.
- Metrik operasional: first-pass rate, exception rate, review time, SLA breach — per clerk & per firm.
- [ ] Completeness score · [ ] Klasifikasi exception · [ ] Metrik per clerk/firm

## EN-11 · Pricing & go-to-market (Business Development)
- Pricing per-klien + paket premium analisa; case study pilot 1 firma (angka sebelum/sesudah); firma = channel/reseller; KPI komersial (demo→pilot→bayar, churn, ekspansi).
- [ ] Pilot 1 firma · [ ] Case study · [ ] Struktur harga & partner program

---

# Bagian 3 · Keamanan Data (Security Engineer — SE)

- **SE-01 · Audit OWASP Top 10 (awal F0 ✅):** uji IDOR/akses silang selesai via `e2e-isolation.ts` (8/8). Lanjutan: SSRF guard, error page tanpa stack, raw query audit — F1. [x] IDOR test · [ ] SSRF · [ ] error/stack · [ ] raw query
- **SE-06 · CI security (awal F0 ✅):** step `npm run security:audit` di CI (continue-on-error dulu); secret scanning (gitleaks) & renovate → F1. [x] audit step · [ ] gitleaks · [ ] renovate

---

# Bagian 4 · Kualitas Kode (SonarQube Engineer — SQ)

- **SQ-01 · Quality gate di CI** → **threshold coverage aktif (F1)** di vitest: statements 31 / branches 30 / functions 20 / lines 30 (baseline 2026-08-09, naikkan bertahap). Terukur: 32,97 / 35,23 / 25 / 32,3. Target ≥80% file baru → F2. [x] thresholds · [ ] naikkan (F2)
- **SQ-02 · SAST & security hotspots** tiap PR (linter keamanan + review hotspot). [ ]
- **SQ-03 · TypeScript strict penuh:** tsconfig sudah `strict: true`; sisa cast minimal (1× di db.ts) + audit `any` di src → F2. [x] strict aktif · [ ] audit any (F2)
- **SQ-04 · Cognitive complexity:** refactor service panjang (pipeline/worker) jadi modul kecil; batas complexity per fungsi. [ ]
- **SQ-05 · Dependency governance:** step `npm run security:audit` di CI (F0, continue-on-error); renovate & pinning → F2. [x] audit step · [ ] renovate (F2)
- **SQ-06 · Lint/format enforce + coverage report di CI** (badge repo). [x] eslint + threshold lokal · [ ] badge (setelah push GitHub)
- **SQ-07 · Test pyramid lengkap:** unit 112 ✅ (naik dari 89 via component tests F1) → integration/E2E via scripts (review/upload/isolation di CI) → Playwright penuh otomatis → F2. [x] unit · [x] e2e scripts · [ ] Playwright CI (F2)

---

# Bagian 5 · Roadmap Bertahap

| Fase | Isi | Item terkait | Kriteria selesai |
|---|---|---|---|
| **F0 · Security & CI quick wins** ✅ (2026-08-09) | Guard/hapus debug-login, kredensial ke env, CI diperbarui + verifikasi lokal, isolasi tenant test (8/8), headers HSTS | TD-01, TD-02, TD-10, TD-17, TD-09(test), SE-01(awal), SE-06(awal) | ✅ Centang: TD-01, TD-02, TD-09-test, TD-17(sebagian), SE-01(awal), SE-06(awal) · ⏳ tersisa: push ke GitHub (TD-10) |
| **F1 · Engineering foundation** 🔄 (2026-08-09) | Tenant extension + ALS (EN-04 f1), event bus + hook (EN-05 f1), component tests (TD-13), coverage gate (SQ-01), docs infrastruktur (TD-03/04/05/15) | TD-03..05, TD-13, EN-04, EN-05, SQ-01..07, SE-02 | ✅ EN-04 f1, EN-05 f1, TD-13 (mulai), SQ-01, SQ-03 (strict), SE-02 (sudah kuat) · ⏳ wrap route tenant (F2), outbox (F2), keputusan provider infra (Rama), push GitHub |
| **F2 · Knowledge Platform** | KB versioned + approval (EN-01), pengenalan profil klien (EN-02), feedback loop AI (EN-03), test LLM + OCR | TD-06, TD-07→EN-01, TD-08, EN-01..03 | KB bisa di-update via UI + audit; klien lama langsung dikenali; first-pass naik |
| **F3 · Portal Klien** | Persona klien, auth klien, upload mandiri, laporan self-service, wawasan AI | EN-08, EN-06, EN-07, EN-10 | Pilot 1 firma: overhead −77%, onboarding <2 mnt |
| **F4 · Scale & monetisasi** | Konektor pajak DJP & bank, template usaha, pricing premium, case study | EN-09, EN-11, TD-14 | Case study terbit; 3+ firma pilot |

**Urutan logika:** F0 menutup lubang keamanan → F1 bikin fondasi aman dikembangkan → F2 bikin AI makin pintar (KB + profil klien) → F3 lever terbesar (portal) dengan AI yang sudah mengenal klien → F4 jualan & skala.

---

# ✅ Selesai

_(belum ada — mulai dari F0)_
