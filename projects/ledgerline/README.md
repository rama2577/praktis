# LedgerLine — AI Bookkeeping Platform

Platform operasional untuk kantor akuntan Indonesia: dokumen klien (PDF/JPG/XLSX) → AI pipeline menghasilkan **draft jurnal** (PSAK/PPN/PPh-aware, confidence score) → **review manusia 4 lapis** (Junior → Senior → Tax → Partner) → jurnal final, dengan dashboard operasional real-time. UI Bahasa Indonesia, tema dark navy.

## Quickstart (≤ 15 menit)

**Prasyarat:** Node ≥ 20 (npm), PostgreSQL 16, Redis 7+ (macOS: `brew install postgresql@16 redis`).

```bash
# 1. Install & siapkan DB
npm ci
cp .env.example .env            # isi DATABASE_URL, AUTH_SECRET, dsb.
createdb ledgerline             # atau buat DB sesuai .env
npx prisma migrate deploy
npx prisma db seed              # 1 firma, 6 user, 3 klien, 22 jurnal, antrian per role

# 2. Jalankan (3 terminal)
npm run dev                     # web: http://localhost:3000
npm run worker                  # pipeline AI (butuh Redis berjalan)
redis-cli ping                  # pastikan Redis aktif
```

**Login demo** (password `password123`):
`admin@ledgerline.dev` (ADMIN dev — akses semua modul) · `budi@` / `dwi@` (JUNIOR) · `rina@` (SENIOR) · `sari@` (TAX) · `andi@` (PARTNER)

**Coba alur utama:** login admin → *Klien* → pilih klien → upload PDF/XLSX → ~2 detik kemudian jurnal draft muncul di *Antrian Review* → setujui berlapis hingga APPROVED. Exception (dokumen tak jelas) muncul di *Pengecualian*.

## Environment Variables

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL, contoh `postgresql://staff@localhost:5432/ledgerline` |
| `AUTH_SECRET` | ✅ | Rahasia sesi NextAuth (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | dev | `true` untuk localhost |
| `REDIS_URL` | ⚠️ | BullMQ/rate limit; default `redis://localhost:6379` |
| `STORAGE_ENCRYPTION_KEY` | ⚠️ prod | Kunci enkripsi at-rest dokumen, hex 64 (`openssl rand -hex 32`); tanpa ini memakai kunci DEV |
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | opsional | LLM OpenAI-compatible (default GLM `https://api.z.ai/api/paas/v4`, `glm-4.6`); pipeline jalan tanpa key via rule engine |

## Arsitektur

```
[Upload dokumen] → [BullMQ worker: parse PDF/XLSX/JPG] → [Rule engine + LLM (opsional)]
      → [Validasi: balance=0, psakRef+COA] → [JournalEntry DRAFT/EXCEPTION + confidence]
      → [Review: JUNIOR → SENIOR → TAX → PARTNER] → [APPROVED]
```

- **Monolith Next.js** (App Router) — halaman + API + server logic; worker proses terpisah. *(ADR-001)*
- **State machine terpusat** `src/server/journal-machine.ts` — semua transisi status jurnal + audit trail + SLA. *(ADR-002)*
- **Tenant-aware** (`firmId` di semua tabel), MVP single-firm. *(ADR-003)*
- **AI modular** `src/ai/`: rule engine deterministik (knowledge base `src/ai/knowledge/`) primer, LLM swappable via env. *(ADR-004)*
- **Enkripsi at-rest** AES-256-GCM untuk dokumen. *(ADR-005)*
- Teknologi: Next.js 16, TypeScript strict, Tailwind v4, Prisma 6 + PostgreSQL, BullMQ + Redis, NextAuth v5 (Credentials + bcrypt), Vitest, pino, Recharts.

### Struktur penting
- `src/ai/` — pipeline AI (parsers, rule-engine, drafting, validation, llm) + `knowledge/` (13 referensi: PSAK, PPN/PPh, COA, template)
- `src/server/` — pipeline, worker, state machine, SLA, dashboard metrics, knowledge listing
- `src/app/dashboard/` — halaman: dashboard (KPI+pipeline+SLA+confidence+activity), antrian review, pengecualian, metrik kualitas, knowledge base, klien
- `src/app/api/` — route API (clients, documents, queues, reviews, exceptions, dashboard, health)
- `scripts/` — generate fixtures, E2E (e2e-upload, e2e-review)
- `docs/` — spec, ADR, DoD, task log

## Perintah

```bash
npm run dev        # web (dev)
npm run build      # build produksi
npm start          # serve hasil build
npm run worker     # worker pipeline AI (terminal terpisah)
npm run lint       # eslint
npm test           # unit test (vitest, 89 test)
npm run test:e2e   # playwright (opsional)
npx prisma studio  # inspeksi DB
```

## Deploy (path terdokumentasi)

1. **DB**: PostgreSQL + Redis terkelola (mis. Neon/Supabase + Upstash), jalankan `prisma migrate deploy` + seed.
2. **Web**: build Next.js → serve (`next start`) di Vercel / Node host; set semua env.
3. **Worker**: proses terpisah menjalankan `npm run worker` (harus punya akses Redis + DB + storage `uploads/` persisten).
4. **Storage**: `uploads/` (terenkripsi) — mount volume persisten; backup kunci `STORAGE_ENCRYPTION_KEY`.
5. **CI**: `.github/workflows/ci.yml` — lint → test → build → migration → E2E integration (PostgreSQL+Redis services).
6. **Healthcheck**: `GET /api/health` (DB + Redis + uptime).

## Roadmap task

| Fase | Task | Status |
|---|---|---|
| Foundation | 1 scaffold · 2 data model+seed · 3 auth+RBAC | ✅ |
| Core Pipeline | 4 klien · 5 upload · 6 AI pipeline · 7 review engine | ✅ |
| Dashboard | 8 KPI · 9 pipeline+queue · 10 SLA+confidence+activity | ✅ |
| Ops & Launch | 11 quality+KB+exception · 12 states+a11y · 13 security+observability · 14 DoD+CI | ✅ |

Checkpoint manusia: Foundation ✅ · Core Pipeline ✅ · Dashboard ✅ (menunggu review Rama) · Complete ⏳
