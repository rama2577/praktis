# Implementation Plan: LedgerLine — AI Bookkeeping Operations Platform

Berdasarkan `docs/spec.md` v0.1 (menunggu review). Dokumen ini = rencana; `tasks/todo.md` = checklist tugas yang dieksekusi.

---

## Overview

Membangun platform AI bookkeeping: upload dokumen klien → AI pipeline menghasilkan draft journal (PSAK/PPN/PPh-aware, confidence score) → review manusia 4 role → dashboard operasional real-time (KPI, pipeline, SLA). Dimulai dari single kantor akuntan, multi-client, sesuai mockup.

## Architecture Decisions

- **1. Monolith Next.js (App Router) full-stack** — halaman + API routes + server logic dalam satu app. Alasan: tim kecil, deploy sederhana, vertical slice cepat; pisah service nanti kalau AI pipeline butuh scale terpisah.
- **2. PostgreSQL + Prisma** — relational wajib untuk journal entries & audit trail; Prisma memberi type safety + migration.
- **3. BullMQ + Redis untuk AI pipeline** — upload tidak memblokir request; worker OCR/draft jalan async, status di-track per job.
- **4. State machine eksplisit untuk journal lifecycle** — `DRAFT → JUNIOR_REVIEW → SENIOR_REVIEW → TAX_REVIEW → PARTNER_APPROVAL → APPROVED` (+ `EXCEPTION`, `REJECTED`, `ARCHIVED`). Transisi hanya lewat fungsi terpusat agar valid & ter-audit.
- **5. RBAC berbasis role** — `ADMIN, JUNIOR, SENIOR, TAX, PARTNER`; queue query di-filter role.
- **6. Tenant-aware sejak awal** — semua tabel punya `firmId`; walau MVP single-firm, tidak perlu migrasi besar nanti.
- **7. AI pipeline modular** — `OCR → EventDetection → JournalDrafting → Validation → Scoring`; tiap modul interface terpisah sehingga provider LLM bisa diganti (Open Question #6).
- **8. Knowledge base `ledgerline-ai-bookkeeper` sebagai sumber aturan** — references (PSAK, PPN/PPh, COA, journal templates) dipakai rule engine & prompt drafting; tidak hardcode treatment di kode.
- **9. LLM: GLM (Z.ai) primary, OpenAI fallback** — keduanya OpenAI-compatible; switch via env (`LLM_BASE_URL`, `LLM_MODEL`). Model vision untuk JPG/scan PDF. (Rekomendasi, disetujui Rama 2026-08-07)
- **10. UI Full Bahasa Indonesia** — seluruh teks antarmuka Indonesia; dark theme sesuai mockup.
- **11. Akun admin dev** — selain login per-reviewer, ada 1 user ADMIN untuk menguji semua modul & flow selama development.

## Task List

### Phase 1: Foundation
- [ ] Task 1: Scaffold project (Next.js + TS strict + Tailwind + ESLint + Vitest + Playwright + struktur folder)
- [ ] Task 2: Data model Prisma + migration + seed (firm, users 4 role, clients, documents, journal entries, review tasks, activity logs)
- [ ] Task 3: Autentikasi + RBAC (login, session, role guard, halaman login)

### Checkpoint: Foundation
- [ ] App build & jalan di `pnpm dev`
- [ ] Login sebagai tiap role berhasil; guard menolak akses antar-role
- [ ] Review dengan Rama sebelum lanjut

### Phase 2: Core Pipeline (vertical slice pertama yang end-to-end)
- [ ] Task 4: Manajemen klien (CRUD + onboarding, list klien)
- [ ] Task 5: Upload dokumen (form + API, validasi tipe/ukuran, simpan file + metadata)
- [ ] Task 6: AI pipeline worker (BullMQ): OCR → deteksi business event → draft journal (rule engine + LLM, pakai knowledge base) → confidence score + exception flags
- [ ] Task 7: Review queue engine (state machine, assign by role, flag urgent, riwayat aksi)

### Checkpoint: Core Pipeline
- [ ] Alur end-to-end 1 klien: upload → draft muncul di queue Junior → review → approve → journal final tersimpan
- [ ] Traceability lengkap pada 1 contoh journal (event → PSAK ref → COA → reviewer)
- [ ] Review dengan Rama sebelum lanjut

### Phase 3: Dashboard & Ops (mewujudkan mockup)
- [ ] Task 8: Layout dashboard (sidebar 3 grup: OPERATIONS/ANALYTICS/SYSTEM, header, dark theme) + 5 KPI cards
- [ ] Task 9: Pipeline visualization (Draft → Rule Engine → Junior → Senior → Tax, dengan count) + panel Review Queues (4 role, urgent badge)
- [ ] Task 10: SLA monitoring (timer per stage + progress bar vs target) + AI Confidence chart + Recent Activity feed

### Checkpoint: Dashboard
- [ ] Dashboard menampilkan data real (bukan mock) sesuai mockup: KPI, pipeline, queues, SLA, activity
- [ ] Responsive: layout tidak pecah di mobile (sidebar collapse)
- [ ] Review dengan Rama sebelum lanjut

### Phase 4: Quality, Security & Ship
- [ ] Task 11: Quality Metrics & Knowledge Base page + exception management (list flag, resolusi)
- [ ] Task 12: Empty/loading/error states, aksesibilitas (checklist), polish interaksi (hover/active/disabled)
- [ ] Task 13: Security hardening (input validation, upload safety, rate limit, audit log) + observability (logging, alert SLA breach)
- [ ] Task 14: Pre-launch: Definition of Done, dokumentasi (README, ADR), CI/CD (lint+test+build), seed demo

### Checkpoint: Complete
- [ ] Semua acceptance criteria task terpenuhi
- [ ] Definition of Done checklist lulus (`references/definition-of-done.md`)
- [ ] Siap pilot dengan 1 kantor akuntan

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Akurasi accounting rendah → salah journal | **High** | Traceability wajib, human-in-loop (tidak bisa bypass), validation rules dari knowledge base, confidence score + exception flag, materiality rules |
| OCR gagal pada dokumen beragam (invoice/rekening koran) | High | Confidence scoring, flag "low confidence" ke review manual, pipeline modular (ganti OCR engine tanpa rombak) |
| Scope creep mengejar mockup penuh | Med | Vertical slices; mockup = end-state, dikerjakan bertahap (Phase 3); feature flags untuk yang belum lengkap |
| Data klien sensitif bocor | High | RBAC ketat, upload validation, enkripsi at-rest, audit log, security checklist sebelum rilis |
| LLM provider berubah harga/availability | Med | Abstraksi `src/ai/` dengan interface provider; prompt & aturan terpisah dari kode pipeline |
| SLA breach tak terdeteksi | Med | SLA timer per stage sejak Task 7; alert & breach list di dashboard (Task 10) |

## Keputusan (dikonfirmasi Rama, 2026-08-07)

1. **Single-firm first**; schema tenant-aware.
2. Dokumen: **invoice + rekening koran**; format **PDF/JPG/XLSX** (semua).
3. **Login per-reviewer** + **akun admin dev**.
4. Deployment awal: **lokal**.
5. UI: **Full Bahasa Indonesia**.
6. LLM: **GLM (Z.ai) primary, OpenAI fallback** (OpenAI-compatible, switch via env).

Lihat `docs/spec.md` §9 untuk detail & catatan LLM.

## Parallelization Opportunities

- **Aman paralel:** Task 11 (setelah Phase 3), test untuk fitur yang sudah selesai, dokumentasi.
- **Wajib sekuensial:** migrasi DB (Task 2 → semua), auth (Task 3) sebelum fitur ber-role, worker pipeline (Task 6) sebelum queue engine (Task 7) — tapi Task 4 & 5 bisa jalan setelah Task 3 selesai.
- **Butuh koordinasi:** kontrak API antara pipeline worker dan UI queue (definisikan di Task 6 dulu, baru UI Task 7–9).
