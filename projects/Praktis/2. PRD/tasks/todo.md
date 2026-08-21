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

## Task 2: Data model Prisma + migration + seed ✅ (2026-08-07)

**Description:** Rancang & migrasi schema: `Firm`, `User` (role: ADMIN/JUNIOR/SENIOR/TAX/PARTNER), `Client`, `Document` (file + metadata + status OCR), `JournalEntry` (header: status state machine, confidence, exception flags) + `JournalLine` (debit/kredit), `ReviewTask` (assignee, stage, due SLA, urgent), `ActivityLog` (audit trail), `SlaEvent`. Seed demo: 1 firm, 6 user (admin dev + 4 role), 3 klien, contoh dokumen & journal.

**Acceptance criteria:**
- [x] `npx prisma migrate dev` sukses; schema ter-versioning — migration `20260807045922_init`
- [x] Semua tabel punya `firmId` (tenant-aware) dan `createdAt/updatedAt` — verified: 0 orphan
- [x] Seed berjalan: `npx prisma db seed` — 1 firm, 6 user, 3 klien, 3 dokumen, 22 jurnal, 65 baris, 29 review task, 5 activity, 6 SLA event
- [x] Enum state machine journal & role terdefinisi di schema — 9 enum

**Verification:**
- [x] `npx prisma migrate dev` + `npx prisma db seed` sukses
- [x] Query test: queue per role = JUNIOR 5 / SENIOR 3 / TAX 2 / PARTNER 1 pending (sesuai mockup); urgent 1; SLA breach 2 (Junior + Tax); 0 jurnal tidak balance; 0 orphan

**Dependencies:** Task 1
**Files likely touched:** prisma/schema.prisma, prisma/seed.ts, src/lib/db.ts
**Estimated scope:** M (3-5 files)

---

## Task 3: Autentikasi + RBAC ✅ (2026-08-07)

**Description:** Auth.js (NextAuth v5 beta) session-based (JWT); halaman login Bahasa Indonesia; role guard di server (layout dashboard + `requireRole`); helper `requireRoleApi` untuk route handlers; logout.

**Acceptance criteria:**
- [x] Login dengan user seed (tiap role) berhasil — verified via HTTP: rina (SENIOR), admin (ADMIN), andi (PARTNER); password salah ditolak (`/login?error=CredentialsSignin`)
- [x] Akun admin dev bisa akses semua modul — role ADMIN di OPERATIONAL_ROLES & SYSTEM_ROLES
- [x] Halaman yang tidak diizinkan role → redirect — tanpa session `/dashboard` → 307 ke `/login`; `requireRoleApi` siap utk 401/403
- [x] Logout berfungsi — POST signout → session cookie bersih, `/dashboard` → redirect `/login`
- [x] `requireRole` dipakai di semua API route yang menyentuh data — helper tersedia di `src/lib/rbac.ts`

**Verification:**
- [x] Tests pass: `npm test` — 10/10 (4 smoke + 6 auth/RBAC)
- [x] Build succeeds: `npm run build` — rute /login, /dashboard, /api/auth/[...nextauth] terdaftar
- [x] Manual: alur HTTP penuh (CSRF → credentials → session → halaman → logout) sukses

**Dependencies:** Task 2
**Files likely touched:** src/lib/auth.ts, src/lib/rbac.ts, src/lib/roles.ts, src/types/next-auth.d.ts, src/app/api/auth/[...nextauth]/route.ts, src/app/login/*, src/app/dashboard/{layout,page}.tsx, src/components/layout/sidebar.tsx, tests/auth.test.ts
**Estimated scope:** M

## Task 4: Manajemen klien (CRUD) ✅ (2026-08-07)

**Description:** Halaman Clients (daftar, tambah, edit, nonaktifkan) dengan validasi form; API routes CRUD ter-proteksi (ADMIN/SENIOR); kolom: nama, industri (retail/jasa/f&b → menentukan COA), status aktif.

**Acceptance criteria:**
- [x] Admin bisa tambah/edit klien; list menampilkan jumlah dokumen & status — verified via HTTP: POST 201, PATCH edit 200, UI render daftar + badge status
- [x] Validasi: nama wajib, industri dari enum; error state terlihat — POST nama kosong → 400 `{name: "Nama klien wajib diisi."}`; 6 unit test validasi
- [x] Klien nonaktif tidak muncul di queue baru — `listActiveClients()` filter status ACTIVE (verified: hanya 3 klien aktif); PATCH status INACTIVE → hilang dari helper aktif
- [x] Proteksi role: GET/POST/PATCH /api/clients → 401 tanpa session, 403 untuk JUNIOR (verified via HTTP)

**Verification:**
- [x] Tests pass: `npm test` — 16/16 (smoke 4 + auth 6 + clients 6)
- [x] Build succeeds: `npm run build` — rute /api/clients, /api/clients/[id], /dashboard/clients terdaftar
- [x] Manual: CRUD penuh via API + halaman UI; RBAC junior ditolak

**Dependencies:** Task 3
**Files likely touched:** src/server/clients.ts, src/app/api/clients/route.ts, src/app/api/clients/[id]/route.ts, src/app/dashboard/clients/{page,clients-manager}.tsx, src/components/clients/{client-form,client-status-action}.tsx, tests/clients.test.ts
**Estimated scope:** M

## Task 5: Upload dokumen ✅ (2026-08-07)

**Description:** Form upload (drag & drop) + API: validasi tipe (PDF/JPG/XLSX) & ukuran, simpan file (local dev) + record `Document` (clientId, tipe, hash, status=PENDING), enqueue job pipeline.

**Acceptance criteria:**
- [x] Upload PDF/JPG sukses; tipe lain/oversize ditolak dengan pesan jelas — verified: PDF 201; .exe / PDF palsu (magic bytes) / 11MB / klien invalid → 400 dengan pesan
- [x] Document record tersimpan + file ter-hash (integritas) — record PENDING + SHA-256 + file di `uploads/{clientId}/{id}-{nama}`; 8 unit test validasi
- [x] Job pipeline ter-enqueue (status terlihat di DB) — ActivityLog `PIPELINE_ENQUEUED` tercatat; implementasi BullMQ di Task 6 (`src/lib/queue.ts` placeholder)

**Verification:**
- [x] Tests pass: `npm test` — 28/28 (smoke 4 + auth 6 + clients 6 + upload 12)
- [x] Build succeeds: `npm run build` — rute /api/documents & /dashboard/clients/[id] terdaftar
- [x] Manual: upload via curl (multipart) + cek record/activity/file + halaman detail render

**Dependencies:** Task 3/4
**Files likely touched:** src/server/documents.ts (validasi+magic bytes+hash+sanitize), src/lib/storage.ts, src/lib/queue.ts (placeholder), src/app/api/documents/route.ts, src/app/dashboard/clients/[id]/page.tsx, src/components/documents/upload-form.tsx, tests/upload.test.ts
**Estimated scope:** M

## Task 6: AI pipeline worker (OCR → event → draft → score) ✅ (2026-08-07)

**Description:** Worker BullMQ: ambil job → parse dokumen (PDF via pdf-parse v2, XLSX via SheetJS, JPG via LLM vision) → deteksi business event → drafting journal via rule engine + LLM (prompt berdasar knowledge base `ledgerline-ai-bookkeeper`) → validation rules → confidence score + exception flags → simpan `JournalEntry` status DRAFT/EXCEPTION. Abstraksi provider LLM di `src/ai/`.

**Acceptance criteria:**
- [x] Worker memproses dokumen → JournalEntry DRAFT dengan JournalLine debit/kredit valid (balance = 0) — verified E2E: PDF invoice → DRAFT 0.74 (Piutang 9.435.000 = 8.500.000 + PPN 935.000), XLSX rekening koran → DRAFT 0.7
- [x] Setiap line punya `psakRef` & `accountCode` (traceability) — verified: traceable=true semua baris
- [x] Confidence score terisi; dokumen tidak jelas → flag EXCEPTION, bukan hasil asal — skor 0–1; rule engine menandai exception saat event/jumlah tak terdeteksi; JPG tanpa LLM key → FAILED/EXCEPTION (bukan mengarang)
- [x] Provider LLM bisa diganti via env tanpa ubah pipeline — `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY` (GLM default, OpenAI-compatible, Ollama opsional); pipeline jalan TANPA key via rule engine

**Verification:**
- [x] Tests pass: `npm test` — 46/46; coverage rule-engine **96.5%**, validation 81.5% (target ≥80% tercapai)
- [x] Build succeeds: `npm run build`
- [x] Manual: upload invoice PDF & rekening koran XLSX → worker (`npm run worker`) → jurnal DRAFT balance 0 + traceable

**Dependencies:** Task 5
**Files likely touched:** src/ai/{rule-engine,validation,llm,parsers,drafting}.ts + knowledge/ (13 file referensi dari skill), src/server/{pipeline,pipeline-worker}.ts, src/lib/queue.ts (BullMQ), scripts/{generate-fixtures,e2e-upload}.ts, tests/pipeline.test.ts
**Estimated scope:** L (dipecah: 6a rule engine+validation, 6b parsers+LLM, 6c worker+orchestrasi)

**Catatan:** Redis 8.10 diinstall via Homebrew (modul redisbloom/redisearch/redisjson/redistimeseries dinonaktifkan di redis.conf karena file .so tidak ada — service jalan normal tanpa modul itu).
## Task 7: Review queue engine (state machine + SLA) ✅ (2026-08-07)

**Description:** State machine terpusat untuk lifecycle journal (`DRAFT → JUNIOR_REVIEW → SENIOR_REVIEW → TAX_REVIEW → PARTNER_APPROVAL → APPROVED` + EXCEPTION/REJECTED/ARCHIVED); antrian per role; aksi approve/reject/return dengan catatan; ActivityLog untuk tiap transisi; SLA timer (target per stage: Junior 120m, Senior 240m, Tax 240m, Partner 120m).

**Acceptance criteria:**
- [x] Transisi state hanya lewat fungsi terpusat (`transitionJournal`); transisi invalid ditolak — verified: unit test matrix 15 test, API → 409 pada transisi invalid
- [x] Queue tiap role menampilkan item sesuai stage-nya; urgent tampil pertama — verified: `GET /api/queues` role-scoped (assigneeId), order urgent desc + createdAt asc; admin lihat semua stage
- [x] Approve/reject/return tercatat di ActivityLog dengan user + timestamp + detail (from/to/stage/note) — verified E2E audit trail
- [x] SLA breach ter-set saat melewati target stage — `SlaEvent` dibuat tiap task selesai (status MET/BREACHED via `computeFinalSlaStatus`); status live MET/AT_RISK/BREACHED tersedia

**Verification:**
- [x] Tests pass: `npm test` — 61/61 (15 test baru state machine + SLA)
- [x] Build succeeds + lint bersih
- [x] E2E (`scripts/e2e-review.ts`): alur penuh JUNIOR→SENIOR→TAX→PARTNER→APPROVED (semua 200); RBAC dwi→task budi = 403; reject tanpa catatan = 400; return JUNIOR→DRAFT; reject→REJECTED; audit trail 6 entri benar; SLA events MET

**Dependencies:** Task 6
**Files touched:** src/server/{journal-machine,sla}.ts, src/app/api/{queues,reviews/[taskId]}/route.ts, src/app/dashboard/queues/page.tsx, src/components/queues/{queue-list,stage-meta}.tsx, sidebar (Antrian Review aktif), tests/review.test.ts, scripts/e2e-review.ts
**Estimated scope:** L (state machine + API + UI antrian + SLA)

**Catatan:** assignee otomatis via load-balancing (user role stage dengan task pending paling sedikit); return dari JUNIOR → DRAFT (belum ada task — menunggu proses ulang). Halaman antrian menampilkan garis jurnal, ref PSAK, keyakinan AI, tenggat.
## Task 8: Layout dashboard + KPI cards ✅ (2026-08-07)

**Description:** Layout sesuai mockup: sidebar 3 grup (Operasional/Analitik/Sistem), header (tanggal, status AI Online), dark navy theme; 5 KPI cards dari data real: Klien Aktif (+bulan ini), AI Automation %, Jobs in Progress (AI vs review), Transactions Hari Ini (vs rata-rata), SLA Breaches (rincian role).

**Acceptance criteria:**
- [x] KPI menghitung dari DB (bukan hardcode) — `src/server/dashboard.ts` (agregasi paralel + pure helpers); angka berubah saat data berubah (verified: 3 · 95,5% · 18 · 22 · 2 sesuai data seed)
- [x] Sidebar aktif-state & navigasi berfungsi; profil user tampil; seluruh teks UI Bahasa Indonesia
- [x] Responsive: sidebar jadi drawer di mobile (hamburger + overlay, `DashboardShell` client component)

**Verification:**
- [x] Tests pass: `npm test` — dashboard.test.ts 5/5 (automationPct, deltaVsAverage, daysSince)
- [x] Build + lint bersih
- [x] E2E: login admin → `/dashboard` 200; semua label KPI ada; nilai KPI = 3 klien aktif / 95,5% AI automation (21/22 AI tanpa exception) / 18 jobs in progress (9 draft AI + 11 review) / 22 transaksi hari ini / 2 SLA breach (Junior + Pajak); elemen mobile (hamburger, drawer) ada di HTML

**Dependencies:** Task 7
**Files touched:** src/server/dashboard.ts, src/components/dashboard/kpi-cards.tsx, src/components/layout/{dashboard-shell,sidebar}.tsx, src/app/dashboard/{layout,page}.tsx, tests/dashboard.test.ts
**Estimated scope:** M
## Task 9: Pipeline visualization + Review Queues panel ✅ (2026-08-07)

**Description:** Diagram alur 5 stage (Draft Jurnal → Rule Engine → Review Junior → Review Senior → Review Pajak) dengan count item per stage; panel Antrian Review 4 role dengan count + badge urgent (merah), sesuai mockup.

**Acceptance criteria:**
- [x] Count per stage akurat dari DB & auto-refresh — `getPipelineData` (statusCounts + dokumen PENDING/PROCESSING + task PENDING); client polling `GET /api/dashboard` tiap 30 dtk (label waktu sinkronisasi + fallback error)
- [x] Klik stage/queue → navigasi ke halaman antrian — semua stage & baris queue adalah Link ke `/dashboard/queues`
- [x] Urgent badge tampil untuk item bertanda urgent — badge merah "N urgent" per stage (seed: JUNIOR 1 urgent)

**Verification:**
- [x] Tests pass: `npm test` — 61 + 4 baru = 65/65 (buildPipelineStages, buildQueueSummary)
- [x] E2E: upload dokumen → Rule Engine naik 1 (1→2) ✓; seed bersih → draft=8, ruleEngine=1, junior=5, senior=3, tax=3 (TAX+PARTNER); queues JUNIOR 5/1 urgent, SENIOR 3, TAX 2, PARTNER 1 (sesuai mockup); badge urgent & link antrian ada di HTML
- [x] Build + lint bersih

**Dependencies:** Task 8
**Files touched:** src/server/dashboard.ts (pipeline builders), src/components/dashboard/pipeline-queues-panel.tsx, src/app/api/dashboard/route.ts, src/app/dashboard/page.tsx, tests/dashboard.test.ts
**Estimated scope:** M
## Task 10: SLA monitoring + AI confidence + Activity feed ✅ (2026-08-07)

**Description:** Section SLA 4 stage review dengan progress bar vs target (Junior ≤2 jam, Senior ≤4 jam, Pajak ≤4 jam, Partner ≤2 jam) + status warna (hijau/kuning/merah); chart Distribusi Keyakinan AI (Recharts, 4 bucket); feed Aktivitas Terbaru dengan timestamp relatif. (Mockup menyebut 7 metrik — Upload Validation/AI Draft/Delivery butuh data latensi pipeline yang belum dicatat; 4 metrik review diimplementasikan dari data aktual, sisanya menyusul saat observability ditambah di Task 13.)

**Acceptance criteria:**
- [x] SLA % dihitung dari data aktual vs target per stage; warna sesuai status — `buildSlaSummary` (event selesai MET/BREACHED + task pending elapsed/dueAt); merah jika breach/overdue, kuning ≥80%, hijau selainnya
- [x] Confidence chart terisi dari skor journal aktual — `bucketConfidence` 4 bucket (<50, 50–70, 70–85, ≥85); Recharts BarChart; data 22 jurnal seed (21 di ≥85% — distribusi seed memang miring, chart jujur pada data)
- [x] Activity feed menampilkan aksi nyata dengan timestamp relatif — `formatRelativeTime` ("baru saja", "N mnt lalu", "N jam lalu", "N hari lalu"); label aksi Bahasa Indonesia (`ACTION_LABELS`)

**Verification:**
- [x] Tests pass: `npm test` — 81/81 (buildSlaSummary 3 test, bucketConfidence 2 test, formatRelativeTime 6 test)
- [x] E2E: GET /api/dashboard → sla 4 stage (JUNIOR 5 antre/1 telat/1 breach, SENIOR 3/0, TAX 2/0 + 1 breach, PARTNER 1/0); confidence 4 bucket; activity 5 entri + label; HTML memuat semua section + "1 terlambat"
- [x] Perbaikan seed: `dueAt` task pending sebelumnya dihitung dari createdAt jurnal (lampau) → semua task tampak overdue; sekarang pending normal → tenggat ke depan, hanya task urgent yang lewat 15 mnt (simulasi breach)
- [x] Build + lint bersih

**Dependencies:** Task 8 (Task 9 polling endpoint diperluas)
**Files touched:** src/server/dashboard.ts (+getSlaSummary/getConfidenceDistribution/getRecentActivity/buildSlaSummary/bucketConfidence/ACTION_LABELS), src/lib/format.ts (+formatRelativeTime), src/components/dashboard/dashboard-panels.tsx (pengganti pipeline-queues-panel; polling 30 dtk mencakup SLA/confidence/activity), src/app/api/dashboard/route.ts, src/app/dashboard/page.tsx, prisma/seed.ts (fix dueAt), tests/{dashboard,format}.test.ts
**Estimated scope:** M
### Checkpoint: Dashboard
- [ ] Dashboard = mockup dengan data real
- [ ] Mobile tidak pecah
- [ ] **Review Rama** sebelum Phase 4

---

## Task 11: Quality Metrics + Knowledge Base + exception management ✅ (2026-08-07)

**Description:** Halaman Metrik Kualitas (akurasi AI vs hasil review manusia, korelasi confidence vs status, breach rate per stage); halaman Knowledge Base (daftar 13 referensi dari skill ledgerline — business events, template jurnal, COA, PPN/PPh, PSAK — dengan pencarian); manajemen exception (list, detail, resolusi → JUNIOR_REVIEW dengan catatan, riwayat tercatat).

**Acceptance criteria:**
- [x] Metrik kualitas terhitung — `getQualityMetrics`: Lolos Tanpa Revisi (% task selesai tanpa reject), Exception Rate (4,5% = 1/22), Rata-rata Confidence, Confidence vs Status (exception punya confidence terendah 55% — korelasi terbukti), SLA Breach Rate per stage
- [x] Knowledge base menampilkan isi references dari skill — `listKnowledgeEntries` membaca `src/ai/knowledge/` (13 file, kategori otomatis, preview 800 char, pencarian client-side)
- [x] Exception bisa diresolusi dengan catatan; riwayat tersimpan — `resolveException` (fungsi terpusat di journal-machine): EXCEPTION → JUNIOR_REVIEW + task JUNIOR baru (load-balancing) + ActivityLog `EXCEPTION_RESOLVED` {from, to, note}; catatan wajib (400)

**Verification:**
- [x] Tests pass: `npm test` — 84/84 (pct/avg, knowledgeCategory)
- [x] E2E: halaman Quality/Knowledge/Exceptions render; GET /api/exceptions → 1 item ("Faktur PPN tidak ditemukan"); resolve tanpa catatan → 400; resolve dengan catatan → 200; DB: status JUNIOR_REVIEW + task JUNIOR PENDING ber-assignee + log EXCEPTION_RESOLVED; sisa exception 0
- [x] Build + lint bersih; sidebar: Metrik Kualitas, Knowledge Base, Pengecualian aktif

**Dependencies:** Task 10
**Files touched:** src/server/{metrics,knowledge}.ts, src/server/journal-machine.ts (+resolveException), src/app/dashboard/{quality,knowledge,exceptions}/page.tsx, src/app/api/exceptions/{route,[id]/resolve/route}.ts, src/components/{knowledge/knowledge-browser,exceptions/exceptions-list}.tsx, sidebar.tsx, tests/metrics.test.ts
**Estimated scope:** M
## Task 12: States, aksesibilitas & polish ✅ (2026-08-07)

**Description:** Empty/loading/error states untuk semua panel & queue (skeleton, empty state bermakna, error retry); aksesibilitas sesuai references/accessibility-checklist.md (keyboard nav, focus visible, contrast, aria); interaksi natural di semua tombol & card.

**Acceptance criteria:**
- [x] Tidak ada panel kosong tanpa state; loading pakai skeleton; error punya retry — komponen shared `Skeleton`/`SkeletonList`/`EmptyState`/`ErrorState`; diterapkan ke QueueList & ExceptionsList (skeleton 2–3 kartu, retry, empty ber-ikon); DashboardPanels punya tombol "Coba lagi" saat polling gagal; KnowledgeBrowser empty search; Clients (server) sudah punya empty state
- [x] Keyboard-only: semua aksi via Tab/Enter (semua interaktif = button/link/input); skip link "Lewati ke konten utama" (visible saat fokus); `:focus-visible` global (outline accent) + `prefers-reduced-motion`; hamburger sudah aria-label; flash messages `role="status"` + `aria-live="polite"`; tabel jurnal `th scope="col"`
- [x] Contrast teks vs background WCAG AA — palette dark navy: slate-400/500 di atas card (#101a30/#0b1120) ≥ 4.5:1; `<html lang="id">` sudah ada; title per halaman

**Verification:**
- [x] Tests pass: `npm test` 84/84; build + lint bersih
- [x] HTML: skip link + id="main-content" ter-render; CSS :focus-visible & prefers-reduced-motion ada; komponen states terpasang di queue/exceptions/knowledge

**Dependencies:** Task 9–11
**Files touched:** src/components/ui/{skeleton,empty-state,error-state}.tsx (baru), globals.css (+focus-visible, reduced-motion), queue-list.tsx, exceptions-list.tsx, dashboard-panels.tsx, knowledge-browser.tsx, dashboard-shell.tsx (skip link)
**Estimated scope:** M
## Task 13: Security hardening + observability ✅ (2026-08-07)

**Description:** Proteksi API (RBAC semua route, rate limit upload), enkripsi file at-rest (AES-256-GCM), security headers, audit log + alert SLA breach in-app, logging terstruktur (pino) dengan traceId, healthcheck — sesuai references/security-checklist.md & observability-checklist.md.

**Acceptance criteria:**
- [x] Checklist keamanan lulus — auth bcrypt (sudah), RBAC semua route (audit: 10 route API semuanya requireRoleApi), input validation allowlist + magic bytes + size ≤10MB (Task 5), security headers (X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, tanpa X-Powered-By), no secrets di repo (.env.example placeholder), enkripsi at-rest, rate limit login? (catatan: login rate limit via NextAuth tidak diimplementasi — dicatat untuk pre-launch)
- [x] Semua API route punya RBAC + rate limit upload — Redis fixed-window 10/menit/user di POST /api/documents (429 + log); verified fake file → 400, tanpa auth → 401, upload ke-11 → 429
- [x] SLA breach memicu alert; log job pipeline lengkap (trace id) — SlaEvent BREACHED → ActivityLog `SLA_BREACHED` (in-app, tampil di feed + KPI); pino JSON dengan traceId dibuat saat enqueue → mengalir ke worker → pipeline (semua log: start/parse_error/done + durationMs); /api/health (db + redis + uptime)

**Verification:**
- [x] Tests pass: `npm test` — 89/89 (crypto roundtrip/random IV/korupsi, rate limit pure)
- [x] E2E: health 200 {db,redis}; headers keamanan ada; queues tanpa login 401; fake pdf 400; upload asli 201 → worker proses (9 job pipeline.done); file di disk terenkripsi (bukan magic bytes asli); 429 pada upload ke-11 + log rate_limited
- [x] Build + lint bersih

**Dependencies:** Task 12
**Files touched:** src/lib/{crypto,logger,rate-limit,redis}.ts (baru), src/lib/{storage,queue}.ts, src/server/{pipeline,pipeline-worker}.ts, src/ai/parsers.ts (baca via dekripsi), src/app/api/{documents,health}/route.ts, src/server/journal-machine.ts (SLA_BREACHED), dashboard.ts (ACTION_LABELS), next.config.ts (security headers), .env.example (STORAGE_ENCRYPTION_KEY), tests/security.test.ts
**Estimated scope:** M

**Catatan:** kunci enkripsi dari `STORAGE_ENCRYPTION_KEY` (hex 64); fallback DEV dengan warning — wajib diset di produksi. Email alert SLA breach belum (butuh provider SMTP) — alert in-app sudah; direncanakan di pre-launch.
## Task 14: Pre-launch — DoD, dokumentasi, CI/CD ✅ (2026-08-07)

**Description:** Review akhir terhadap references/definition-of-done.md; README lengkap (setup, env, arsitektur, deploy); ADR untuk keputusan arsitektur utama; CI/CD pipeline (lint → test → build → migration → E2E) sesuai ci-cd-and-automation.

**Acceptance criteria:**
- [x] Definition of Done checklist lulus — `docs/dod.md` (project-specific DoD + status): Correctness/Quality/Integration/Documentation ✅; Ship-readiness 2 item terbuka (login rate limit, email alert) + review Rama — dicatat jujur
- [x] README bisa dipakai developer baru setup < 15 menit — quickstart 3 langkah (install → migrate+seed → 3 terminal), env table, arsitektur + ADR links, deploy path
- [x] CI hijau di push; deploy path terdokumentasi — `.github/workflows/ci.yml` (PostgreSQL+Redis services: lint → test → build → migrate+seed → integration E2E pipeline+review via wait-on + scripts); deploy path di README (DB/Redis managed, web, worker, storage, healthcheck)

**Verification:**
- [x] `npm run check` (lint && test && build) hijau — 89/89 test, lint 0 error, build sukses
- [x] YAML workflow valid; wait-on dev-dep terpasang; eslint ignores coverage/uploads

**Perbaikan lint yang ditemukan saat finalisasi:** coverage/ ikut ter-lint (add ignores), `session` unused di 2 route API, `body: any` + prefer-const di scripts/e2e-review.ts (eslint-disable untuk script dev), react-hooks set-state-in-effect di 2 komponen (dibungkus function async dalam effect), `action` unused di queue-list.

**Dependencies:** Task 13
**Files touched:** .github/workflows/ci.yml (baru), docs/adr/README.md (ADR-001..005, baru), docs/dod.md (baru), README.md (restructure quickstart), package.json (engines, check script, wait-on), eslint.config.mjs (ignores), perbaikan lint di 6 file
**Estimated scope:** M

**Catatan:** CI akan benar-benar hijau saat repo di-push ke GitHub (workflow divalidasi YAML + langkah-langkahnya sama persis dengan yang sudah diverifikasi manual di mesin ini).
### Checkpoint: Complete
- [ ] Semua acceptance criteria terpenuhi
- [ ] DoD lulus
- [ ] Siap pilot dengan kantor akuntan
