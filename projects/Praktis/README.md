# Praktis — Struktur Folder Master

**Satu folder induk untuk seluruh aset Praktis** (AI Bookkeeping untuk Firma Akuntansi Indonesia). Diatur ulang: 2026-08-21. Semua dokumentasi dan coding Praktis dirangkum ke dalam struktur ini.

---

## 📁 Peta Folder

```
Praktis/
├── 1. Produksi Repo/     → Repo aplikasi (kode + deploy)
│   └── ledgerline/       → Source code Next.js 16.3 + Prisma (543 file ter-track git)
├── 2. PRD/               → Seluruh dokumentasi produk & perencanaan
│   ├── docs/             → Spec, PRD v2, build plan, ADR, DoD, design system, pricing
│   ├── tasks/            → Rencana kerja: plan.md, plan-ga.md, plan-tech-debt.md, dll.
│   └── infra/            → Railway services, backup-restore, key rotation
└── 3. Business/          → Aset komersial & pemasaran
    └── praktis-deck/     → Deck V1–V9, manual book v1–v3, mockup, analisa bisnis, teaser
```

---

## 1. Produksi Repo — Aplikasi Live

**Lokal:** `Praktis/1. Produksi Repo/ledgerline/`
**GitHub (public):** https://github.com/rama2577/praktis · branch `main`
**Live (Railway):** https://web-production-7a593.up.railway.app · HTTP 200
**Login demo:** `admin@ledgerline.dev` / `password123`

| Item | Detail |
|---|---|
| Stack | Next.js 16.3 · Prisma · PostgreSQL · TanStack Query · Redis/BullMQ |
| Kualitas | 454 unit test · build bersih · lint 0 error · E2E Playwright 3/3 |
| Deploy | `railway up -d -y -s web` (WAJIB `-s web`) |
| Fitur terbaru | Ekspor laporan PDF/CSV/XLSX semua modul (commit `f390cd55`) |
| LLM routing | Teks `glm-4.5-air` · vision `glm-4.5` · strong `glm-4.6` (z.ai) |

## 2. PRD — Dokumentasi Produk

| Dokumen | Isi |
|---|---|
| `docs/spec.md` | Spec teknis lengkap |
| `docs/PRD-v2-draft.md` + `BUILD-PLAN-v2.md` | PRD v2 & rencana build |
| `docs/analisis-komersial-pricing.md` | Analisa pricing (kuota per klien) |
| `docs/design-system.md` | Design system tema Lark light |
| `docs/dod.md` + `docs/adr/README.md` | Definition of Done & ADR |
| `docs/TECHDEBT.md` | Audit technical debt (sprint selesai) |
| `docs/infrastructure.md` · `infra/` | Infrastruktur & operasional |
| `tasks/plan.md` … `plan-ga-deployment.md` | Rencana kerja berurutan (Task 1→GA) |

## 3. Business — Aset Komersial

| Aset | Isi |
|---|---|
| Deck V1–V9 | Pitch deck evolusi (V9: ekspansi 5 segmen) |
| Manual Book v1–v3 | Manual pengguna aplikasi (v3 terbaru) |
| **Analisa Bisnis (Investor).md/.docx/.pdf** | Versi bootstrap — ask Rp50–75 jt (lokal, tidak di-push) |
| **Analisa Bisnis (Investor Menengah).md** | Versi growth — ask Rp650–750 jt (lokal, tidak di-push) |
| **Teaser Investor.html** | Deck teaser 2 halaman (lokal, tidak di-push) |
| Mockup & images | Screenshot modul untuk deck/manual |

> ⚠️ **Dokumen investor TIDAK di-commit ke GitHub (repo public).** Semua berisi proyeksi + angka pendanaan rahasia — hanya tersedia lokal di `3. Business/praktis-deck/`.

---

## Riwayat Singkat

- **2026-08-07** — Rama online pertama; proyek dimulai
- **Agustus 2026** — Produk inti selesai: OCR hybrid, AI draft jurnal, review berjenjang, 12 modul, tema Lark, 454 test
- **2026-08-13** — Live demo production di Railway
- **2026-08-20** — Ekspor laporan PDF/CSV/XLSX semua modul · Analisa bisnis investor v2.1 (bootstrap)
- **2026-08-21** — Analisa investor versi growth (menengah) + teaser 2 halaman · reorganisasi folder master ini
