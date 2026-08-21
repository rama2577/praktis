# Railway Services & Env — Praktis (F-4, IaC-lite)

> F-4 (2026-08-16) — topologi layanan & konfigurasi sebagai kode (versi-controlled).
> Menjawab TD-03 (Redis non-IaC). Railway pakai plugin (bukan file konfigurasi),
> jadi "IaC" di sini = spesifikasi reproduksi + env referensi yang ter-commit.

## Topologi

| Service | Runtime | Entry | Catatan |
|---|---|---|---|
| `web` | Dockerfile (Next.js standalone) | `node server.js` (branch CMD) | port 3000, mount `web-volume` → `/app/uploads` |
| `worker` | Dockerfile (sama) | `npx tsx src/server/pipeline-worker.ts` | aktif saat `WORKER_MODE=1` |

Plugin: **Postgres 16** (private `*.railway.internal`) · **Redis 7** (queue + rate limit).
Volume: `web-volume` → `/app/uploads` (dokumen terenkripsi AES-256-GCM).

## Reproduksi (dari repo kosong → live)

1. `railway init` → project baru.
2. `railway add` → Postgres + Redis plugin.
3. `railway volume add -m /app/uploads` → `web-volume`.
4. `railway up -d -y` (Dockerfile multi-stage; `prisma migrate deploy` tiap boot).
5. Set env di bawah (service `web` DAN `worker`).
6. Seed: `railway ssh -s web "cd /app && npx prisma db seed"`.

## Env wajib (web + worker)

| Variabel | Service | Keterangan |
|---|---|---|
| `DATABASE_URL` | web, worker | Dari plugin Postgres (copy manual — tidak auto-inject) |
| `REDIS_URL` | web, worker | Dari plugin Redis (copy manual) |
| `AUTH_SECRET` | web | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | web | `true` |
| `STORAGE_ENCRYPTION_KEY` | web, worker | hex 64 (`openssl rand -hex 32`) |
| `STORAGE_INTERNAL_TOKEN` | web, worker | token berbagi file antar service |
| `WEB_INTERNAL_URL` | worker | `http://web.railway.internal:3000` |
| `WORKER_MODE` | worker | `1` |
| `GLM_API_KEY` / `GLM_BASE_URL` | worker | LLM (opsional — fallback rule-engine) |
| `DEMO_PASSWORD` | web | password akun demo (TD-16) |

App-level env lengkap (LLM model routing, email, OCR) → lihat `.env.example`.

## Catatan

- Konfigurasi plugin/Redis tidak ada file `redis.conf` manual — parameter via
  Railway UI/CLI. Untuk repro penuh lintas provider, migrasi ke Terraform/OpenTofu
  masih tersisa (checklist di `docs/infrastructure.md`).
