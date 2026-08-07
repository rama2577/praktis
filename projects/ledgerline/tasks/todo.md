# LedgerLine — Task List (todo.md)

Checklist eksekusi. Format mengikuti `planning-and-task-breakdown`: tiap task punya acceptance criteria, verification, dependencies, perkiraan scope. Task dijalankan satu per satu (incremental-implementation): selesaikan → verifikasi → lanjut.

---

## Task 1: Scaffold project Next.js + TS + Tailwind + tooling ✅ (2026-08-07)

**Description:** Inisialisasi project Next.js (App Router, TypeScript strict), Tailwind CSS, ESLint, Vitest + React Testing Library, Playwright, dan struktur folder sesuai spec (src/app, src/components, src/lib, src/server, src/ai, tests/, e2e/, prisma/).

**Acceptance criteria:**
- [x] `npm run dev` jalan di http://localhost:3000 dengan halaman placeholder (login redirect) — HTTP 200, lang="id"
- [x] `npm run lint` dan `npm run build` sukses tanpa error
- [x] `npm test` menjalankan minimal 1 contoh test (smoke) — 4 tests pass
- [x] Struktur folder sesuai spec §4; `.env.example` ada (DATABASE_URL, REDIS_URL, AUTH_SECRET, LLM_API_KEY/LLM_BASE_URL/LLM_MODEL)

**Verification:**
- [x] Tests pass: `npm test` — 4/4 (formatCurrencyRp + StatusBadge)
- [x] Build succeeds: `npm run build` — Next 16.3.0, TypeScript clean
- [x] Manual: http://localhost:3000 — HTTP 200, konten LedgerLine, lang="id"

**Dependencies:** None
**Files likely touched:** scaffold seluruh folder + config (package.json, tsconfig, tailwind, next.config, vitest.config, playwright.config, .env.example)
**Estimated scope:** M (3-5 files config + folder)

---

## Task 2: Data model Prisma + migration + seed

**Description:** Rancang & migrasi schema: `Firm`, `User` (role: ADMIN/JUNIOR/SENIOR/TAX/PARTNER), `Client`, `Document` (file + metadata + status OCR), `JournalEntry` (header: status state machine, confidence, exception flags) + `JournalLine` (debit/kredit), `ReviewTask` (assignee, stage, due SLA, urgent), `ActivityLog` (audit trail), `SlaEvent`. Seed demo: 1 firm, 6 user (admin dev + 4 role), 3 klien, contoh dokumen & journal.

**Acceptance criteria:**
- [ ] `prisma migrate dev` sukses; schema ter-versioning
- [ ] Semua tabel punya `firmId` (tenant-aware) dan `createdAt/updatedAt`
- [ ] Seed berjalan: `prisma db seed` menghasilkan data demo lengkap
- [ ] Enum state machine journal & role terdefinisi di schema

**Verification:**
- [ ] npx prisma migrate dev` + npx prisma db seed` sukses
- [ ] Query test: ambil queue per role mengembalikan data seed

**Dependencies:** Task 1
**Files likely touched:** prisma/schema.prisma, prisma/seed.ts, src/lib/db.ts
**Estimated scope:** M (3-5 files)

---

## Task 3: Autentikasi + RBAC

**Description:** Auth.js (NextAuth) session-based; halaman login; role guard middleware (route protection: dashboard hanya untuk role tertentu, queue per role); helper `requireRole()` di server & client.

**Acceptance criteria:**
- [ ] Login dengan user seed (tiap role) berhasil; akun admin dev bisa akses semua modul; session cookie valid
- [ ] Halaman yang tidak diizinkan role → redirect/403
- [ ] Logout berfungsi
- [ ] `requireRole` dipakai di semua API route yang menyentuh data

**Verification:**
- [ ] Tests pass: `pnpm test -- --grep auth`
- [ ] Manual: login 4 role, cek akses antar-role ditolak

**Dependencies:** Task 2
**Files likely touched:** src/app/(auth)/login, src/lib/auth.ts, middleware.ts, src/lib/rbac.ts
**Estimated scope:** M

---

### Checkpoint: Foundation
- [ ] Build & dev jalan
- [ ] Login semua role + guard bekerja
- [ ] **Review Rama** sebelum Phase 2

---

## Task 4: Manajemen klien (CRUD)

**Description:** Halaman Clients (daftar, tambah, edit, nonaktifkan) dengan validasi form; API routes CRUD ter-proteksi (ADMIN/SENIOR); kolom: nama, industri (retail/jasa/f&b → menentukan COA), status aktif.

**Acceptance criteria:**
- [ ] Admin bisa tambah/edit klien; list menampilkan jumlah dokumen & status
- [ ] Validasi: nama wajib, industri dari enum; error state terlihat
- [ ] Klien nonaktif tidak muncul di queue baru

**Verification:**
- [ ] Tests pass: `pnpm test -- --grep client`
- [ ] Manual: CRUD klien via UI

**Dependencies:** Task 3
**Files likely touched:** src/app/(dashboard)/clients/*, src/server/clients.ts, tests/clients.test.ts
**Estimated scope:** M

---

## Task 5: Upload dokumen

**Description:** Form upload (drag & drop) + API: validasi tipe (PDF/JPG/XLSX) & ukuran, simpan file (local dev) + record `Document` (clientId, tipe, hash, status=PENDING), enqueue job pipeline.

**Acceptance criteria:**
- [ ] Upload PDF/JPG sukses; tipe lain/oversize ditolak dengan pesan jelas
- [ ] Document record tersimpan + file ter-hash (integritas)
- [ ] Job pipeline ter-enqueue (status terlihat di DB)

**Verification:**
- [ ] Tests pass: `pnpm test -- --grep upload`
- [ ] Manual: upload 1 invoice PDF, cek record + queue job

**Dependencies:** Task 3
**Files likely touched:** src/app/(dashboard)/clients/[id]/upload, src/server/documents.ts, src/lib/storage.ts
**Estimated scope:** M

---

## Task 6: AI pipeline worker (OCR → event → draft → score)

**Description:** Worker BullMQ: ambil job → parse dokumen (PDF teks, XLSX via SheetJS, JPG via LLM vision) → deteksi business event → drafting journal via rule engine + LLM (prompt berdasar knowledge base `ledgerline-ai-bookkeeper`: business-events.md, journal-templates.md, COA per industri, tax-rules-ppn/pph.md) → validation rules → confidence score + exception flags (mis. "Missing VAT invoice") → simpan `JournalEntry` status DRAFT. Abstraksi provider LLM di `src/ai/`.

**Acceptance criteria:**
- [ ] Worker memproses 1 dokumen PDF → JournalEntry DRAFT dengan JournalLine debit/kredit valid (balance = 0)
- [ ] Setiap line punya `psakRef` & `coaAccount` (traceability)
- [ ] Confidence score terisi; dokumen tidak jelas → flag EXCEPTION, bukan hasil asal
- [ ] Provider LLM bisa diganti via env tanpa ubah pipeline

**Verification:**
- [ ] Tests pass: `pnpm test -- --grep pipeline` (rule engine ≥ 80% coverage)
- [ ] Manual: upload invoice sample → cek draft + skor + flag

**Dependencies:** Task 5
**Files likely touched:** src/ai/* (ocr, events, drafting, validation, scoring), src/server/pipeline.ts, src/lib/queue.ts
**Estimated scope:** L (pecah: 6a OCR+event, 6b drafting+validation, 6c scoring+flags) — eksekusi bertahap

---

## Task 7: Review queue engine

**Description:** State machine terpusat untuk lifecycle journal (`DRAFT → JUNIOR_REVIEW → SENIOR_REVIEW → TAX_REVIEW → PARTNER_APPROVAL → APPROVED`, + EXCEPTION/REJECTED/ARCHIVED); queue per role (assign otomatis sesuai stage, urgent flag); aksi review (approve/reject/return dengan catatan); ActivityLog untuk tiap transisi; SLA timer mulai saat masuk stage.

**Acceptance criteria:**
- [ ] Transisi state hanya lewat fungsi terpusat; transisi invalid ditolak
- [ ] Queue tiap role menampilkan item sesuai stage-nya; urgent tampil pertama
- [ ] Approve/reject tercatat di ActivityLog dengan user + timestamp
- [ ] SLA breach ter-set saat melewati target stage

**Verification:**
- [ ] Tests pass: `pnpm test -- --grep review`
- [ ] Manual: review 1 journal sampai APPROVED, cek audit trail

**Dependencies:** Task 6
**Files likely touched:** src/server/journalMachine.ts, src/server/review.ts, src/app/(dashboard)/queues/*
**Estimated scope:** L (pecah: 7a state machine + tests, 7b UI queue + aksi)

---

### Checkpoint: Core Pipeline
- [ ] End-to-end 1 klien: upload → draft → queue → approve
- [ ] Traceability contoh journal lengkap
- [ ] **Review Rama** sebelum Phase 3

---

## Task 8: Layout dashboard + KPI cards

**Description:** Layout sesuai mockup: sidebar 3 grup (OPERATIONS: Dashboard/Pipeline/Queues/Knowledge Base; ANALYTICS: Quality/SLA; SYSTEM: Clients/Settings), header (tanggal, status AI Online, profil user), dark theme; 5 KPI cards dari data real: Active Clients (+this month), AI Automation %, Jobs in Progress (AI vs review), Transactions Today (+vs avg), SLA Breaches (rincian role).

**Acceptance criteria:**
- [ ] KPI menghitung dari DB (bukan hardcode); angka berubah saat data berubah
- [ ] Sidebar aktif-state & navigasi berfungsi; profil user tampil; seluruh teks UI Bahasa Indonesia
- [ ] Responsive: sidebar collapse di mobile

**Verification:**
- [ ] Manual: bandingkan KPI dengan data seed; resize ke mobile

**Dependencies:** Task 7
**Files likely touched:** src/app/(dashboard)/layout.tsx, src/components/layout/*, src/components/kpi/*, src/server/dashboard.ts
**Estimated scope:** M

---

## Task 9: Pipeline visualization + Review Queues panel

**Description:** Diagram alur 5 stage (Draft Journals → Rule Engine → Junior → Senior → Tax) dengan count item per stage; panel Review Queues 4 role dengan count + badge urgent (merah), sesuai mockup.

**Acceptance criteria:**
- [ ] Count per stage akurat dari DB & auto-refresh (polling/SSE ringan)
- [ ] Klik stage/queue → navigasi ke halaman queue terkait
- [ ] Urgent badge tampil untuk item bertanda urgent

**Verification:**
- [ ] Manual: tambah dokumen → count stage berubah

**Dependencies:** Task 8
**Files likely touched:** src/components/pipeline/*, src/components/queues/*, src/server/dashboard.ts
**Estimated scope:** M

---

## Task 10: SLA monitoring + AI confidence + Activity feed

**Description:** SLA section 7 metrik dengan progress bar vs target (Upload Validation 5m, AI Draft 3m, Junior 2h, Senior 4h, Tax 4h, Partner 2h, Delivery same-day) + status warna (hijau/kuning/merah); chart AI Confidence Distribution (Recharts); Recent Activity feed real-time.

**Acceptance criteria:**
- [ ] SLA % dihitung dari data aktual vs target per stage; warna sesuai status
- [ ] Confidence chart terisi dari skor journal aktual (≥1.200 entries demo → distribusi)
- [ ] Activity feed menampilkan aksi nyata dengan timestamp relatif ("2 min ago")

**Verification:**
- [ ] Tests pass: `pnpm test -- --grep sla`
- [ ] Manual: cek bar SLA vs seed; breach tampil di KPI

**Dependencies:** Task 8
**Files likely touched:** src/components/sla/*, src/components/activity/*, src/components/charts/*, src/server/sla.ts
**Estimated scope:** M

---

### Checkpoint: Dashboard
- [ ] Dashboard = mockup dengan data real
- [ ] Mobile tidak pecah
- [ ] **Review Rama** sebelum Phase 4

---

## Task 11: Quality Metrics + Knowledge Base + exception management

**Description:** Halaman Quality Metrics (akurasi AI vs hasil revisi manusia, trend); halaman Knowledge Base (daftar references ledgerline: business events, templates, tax rules — bisa dicari); manajemen exception (list flag, detail, resolusi/close).

**Acceptance criteria:**
- [ ] Metrik kualitas terhitung (mis. % draft yang lolos tanpa revisi)
- [ ] Knowledge base menampilkan isi references dari skill (import/migrasi konten)
- [ ] Exception bisa diresolusi dengan catatan; riwayat tersimpan

**Verification:**
- [ ] Manual: buka 2 halaman baru, resolve 1 exception

**Dependencies:** Task 10
**Files likely touched:** src/app/(dashboard)/quality/*, src/app/(dashboard)/knowledge/*, src/server/metrics.ts
**Estimated scope:** M

---

## Task 12: States, aksesibilitas & polish

**Description:** Empty/loading/error states untuk semua panel & queue (skeleton, empty illustration, error retry); aksesibilitas sesuai `references/accessibility-checklist.md` (keyboard nav, focus, contrast, aria); interaksi natural (hover/active/disabled) di semua tombol & card.

**Acceptance criteria:**
- [ ] Tidak ada panel kosong tanpa state; loading pakai skeleton; error punya retry
- [ ] Keyboard-only: semua aksi bisa diakses via Tab/Enter; focus visible
- [ ] Contrast teks vs background memenuhi WCAG AA di theme dark

**Verification:**
- [ ] Manual: kosongkan data → cek empty state; navigasi keyboard

**Dependencies:** Task 9-11
**Files likely touched:** komponen UI shared, styles, aksesibilitas helper
**Estimated scope:** M

---

## Task 13: Security hardening + observability

**Description:** Input/upload validation lanjutan (magic bytes, size, rate limit), proteksi API (CSRF, RBAC di semua route), enkripsi file at-rest, audit log lengkap; logging terstruktur (pino), alert SLA breach (email/in-app), metric dasar (job duration, error rate) sesuai `references/security-checklist.md` & `observability-checklist.md`.

**Acceptance criteria:**
- [ ] Checklist keamanan lulus (security-checklist.md)
- [ ] Semua API route punya RBAC + rate limit untuk upload
- [ ] SLA breach memicu alert; log job pipeline lengkap (trace id)

**Verification:**
- [ ] Manual: coba akses API tanpa role → ditolak; upload file palsu → ditolak

**Dependencies:** Task 12
**Files likely touched:** src/lib/security.ts, middleware, src/lib/logger.ts, src/server/alerts.ts
**Estimated scope:** M

---

## Task 14: Pre-launch — DoD, dokumentasi, CI/CD

**Description:** Review akhir terhadap `references/definition-of-done.md`; README lengkap (setup, env, arsitektur, cara tambah skill/references); ADR untuk keputusan arsitektur utama (monolith, state machine, tenant-aware); CI/CD pipeline (lint → test → build → deploy) sesuai `ci-cd-and-automation`.

**Acceptance criteria:**
- [ ] Definition of Done checklist lulus semua
- [ ] README bisa dipakai developer baru setup < 15 menit
- [ ] CI hijau di push; deploy path terdokumentasi (atau berjalan)

**Verification:**
- [ ] `pnpm lint && pnpm test && pnpm build` hijau di CI

**Dependencies:** Task 13
**Files likely touched:** README.md, docs/adr/*, .github/workflows/*
**Estimated scope:** M

---

### Checkpoint: Complete
- [ ] Semua acceptance criteria terpenuhi
- [ ] DoD lulus
- [ ] Siap pilot dengan kantor akuntan
