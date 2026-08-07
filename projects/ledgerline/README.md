# LedgerLine — AI Bookkeeping Operations Platform

Platform AI bookkeeping untuk kantor akuntan Indonesia: dokumen mentah klien → draft journal entries (PSAK/PPN/PPh-aware) → review manusia berjenjang → dashboard operasional real-time.

> **Status proyek: FOUNDATION (Task 1 ✅ + Task 2 ✅ — 2026-08-07)** — scaffold + data model + seed jalan. Berikutnya: Task 3 (auth + RBAC). Lihat `docs/spec.md` & `tasks/plan.md`.

## Cara Menjalankan (lokal)

```bash
npm install        # install dependencies
npm run dev        # dev server → http://localhost:3000
npm run lint       # ESLint
npm test           # unit + component tests (Vitest)
npm run build      # production build
npx playwright install   # hanya saat mau jalankan E2E (Task fase verify)
```

**Dashboard KPI (Task 8):**
- 5 KPI real-time dari DB: Klien Aktif (+bulan ini), AI Automation % (jurnal AI tanpa pengecualian), Jobs in Progress (draft AI vs menunggu review), Transactions Hari Ini (vs rata-rata harian), SLA Breaches (rincian per role).
- Responsive: sidebar jadi drawer (hamburger) di layar mobile; header menampilkan tanggal + status AI Online.

**Review queue engine (Task 7):**
```bash
npm run dev   # atau build + start, lalu buka /dashboard/queues
```
- State machine terpusat (`src/server/journal-machine.ts`): semua transisi status jurnal lewat `transitionJournal` — tidak ada jalur langsung lain.
- Antrian per role: JUNIOR → SENIOR → TAX → PARTNER; urgent tampil pertama; admin melihat semua stage.
- Aksi: Setujui (maju ke stage berikutnya), Kembalikan (mundur satu stage), Tolak (wajib catatan) → semua tercatat di ActivityLog + SlaEvent.
- SLA: target Junior 120m / Senior 240m / Tax 240m / Partner 120m; status MET / AT_RISK / BREACHED.

**Pipeline AI (Task 6):**
```bash
brew services start redis          # Redis 8 (sudah diinstall via Homebrew)
npm run worker                     # jalankan worker pipeline (terminal terpisah)
```
- Pipeline berjalan tanpa API key (rule engine deterministik dari knowledge base). Aktifkan LLM (GLM default) dengan mengisi `LLM_API_KEY` di `.env` → drafting yang lebih baik untuk dokumen kompleks.
- JPG/scan memerlukan LLM vision (`LLM_API_KEY`); tanpa key akan masuk status EXCEPTION/FAILED (tidak mengarang hasil).
- Knowledge base: `src/ai/knowledge/` (salinan referensi skill ledgerline: PSAK, PPN/PPh, COA, template jurnal).

**Database (PostgreSQL 16 via Homebrew):**
```bash
brew services start postgresql@16   # pastikan service jalan
cp .env.example .env                # sesuaikan DATABASE_URL
npx prisma migrate dev              # terapkan migrasi
npx prisma db seed                  # data demo (akun: password123)
```

Akun demo: `admin@ledgerline.dev` (ADMIN), `budi@`/`dwi@` (JUNIOR), `rina@` (SENIOR), `sari@` (TAX), `andi@` (PARTNER) — password `password123`. Redis belum dibutuhkan sampai Task 6 (queue pipeline).

## Struktur

| Path | Isi |
|---|---|
| `src/app/` | Halaman & routing (App Router); saat ini: landing placeholder |
| `src/components/` | `ui/` (StatusBadge, dll), `dashboard/`, `pipeline/`, `queues/`, `layout/` |
| `src/lib/` | Utilitas shared (format Rupiah, dll) |
| `src/server/` | Logic server: pipeline, rule engine, queue engine (Task 6–7) |
| `src/ai/` | AI pipeline: parse dokumen, drafting, scoring (Task 6) |
| `tests/` | Unit & component tests (Vitest) |
| `e2e/` | End-to-end tests (Playwright) |
| `docs/spec.md` | Spesifikasi produk |
| `tasks/` | Rencana & checklist (plan.md, todo.md) |

## Cara Kerja Proyek Ini

Proyek ini dibangun mengikuti **agent-skills** (engineering workflow skills):
1. Setiap fase diawali spec/plan → **review Rama** (gate) → baru implementasi.
2. Implementasi per **vertical slice** (satu fitur utuh per task, maks ±5 file).
3. Setiap task punya acceptance criteria + verification; selesai satu, lanjut satu.
4. Domain accounting memakai knowledge base skill `ledgerline-ai-bookkeeper` (PSAK, PPN/PPh, COA, journal templates) — jangan invent treatment.

## Alur Produk (dari mockup)

```
Dokumen klien (invoice, rekening koran)
   → Upload + validasi (SLA 5 menit)
   → AI pipeline: OCR → deteksi business event → draft journal + confidence score (SLA 3 menit)
   → Rule Engine & validation (PSAK, PPN/PPh)
   → Review: Junior (2 jam) → Senior (4 jam) → Tax (4 jam) → Partner (2 jam)
   → APPROVED → Delivery same-day
```

Setiap stage di-track: SLA status, traceability (business event → referensi PSAK → COA → reviewer), activity log.
