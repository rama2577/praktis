# Infrastruktur Target Produksi — Praktis (LedgerLine)

> F1 (2026-08-09) — dokumen keputusan arsitektur untuk production-ready.
> Menjawab TD-03 (Redis), TD-04 (storage), TD-05 (kunci), TD-15 (backup).
> Status: **keputusan provider & akun eksternal masih dibutuhkan** — item di bawah
> adalah target yang harus dipenuhi sebelum rilis; bukan implementasi lokal.

## Prinsip

- **Single-firm dulu, tenant-aware** (ADR-003) — infrastruktur sudah dirancang multi-firm.
- **Data klien = aset sensitif kelas tinggi**: enkripsi at-rest (sudah AES-256-GCM), TLS, akses berbasis peran, audit.
- **Jangan over-provision**: mulai dari managed service sederhana, bukan kubernetes.

## Target arsitektur

```
Pengguna (firma + klien)
        │ HTTPS
        ▼
  ┌─────────────────────────┐
  │  Cloudflare: DNS + WAF  │  ← domain & proxy (tidak nempel di host)
  └──────────┬──────────────┘
             ▼
  ┌─────────────────────────────┐
  │  APP SERVER (stateless)     │  Vercel (awal) → Contabo VPS + Caddy (komersial)
  │  Next.js standalone         │  semua state di luar server → pindah host = ganti env
  └──┬──────────┬───────────┬───┘
     ▼          ▼           ▼
  Postgres    Redis       Object Storage (R2)
  (Railway,   (Upstash,   dokumen terenkripsi AES-256-GCM;
   managed,    queue +     lifecycle: 15 bln aktif → arsip → export → hapus)
   PITR,       rate-         │
   Singapore)  limit)         ▼
                        LLM Engine — GLM (Zhipu)
                        ├─ glm-4-flash   (teks/draft, GRATIS)
                        ├─ glm-4v-flash  (vision/OCR, GRATIS)
                        └─ glm-4.6       (retry kualitas, berbayar-hemat)
                        fallback: rule-engine (tanpa key tetap jalan)
```

| Lapisan | Sekarang (dev) | Target produksi | Item terkait |
|---|---|---|---|
| Web/app | Next.js monolith | Next.js (sama) + reverse proxy (nginx/Caddy) + TLS | — |
| Database | Postgres lokal (brew) | Managed Postgres (Neon/Supabase/RDS) + point-in-time recovery | TD-15 |
| Cache/queue | Redis lokal (Homebrew) | Managed Redis (Upstash/ElastiCache) + TLS; konfigurasi via IaC | TD-03 |
| Storage dokumen | Filesystem `uploads/` (terenkripsi) | Object storage private (R2 primary, Backblaze B2 untuk arsip dingin) — tetap enkripsi AES di atasnya | TD-04 |
| Secret | `.env` lokal | Secret manager (AWS Secrets Manager / Vault / Doppler) + rotasi | TD-05 |
| LLM | GLM (Zhipu) via env | **GLM-4-Flash / GLM-4V-Flash default (gratis)**; glm-4.6 untuk retry; key via secret manager | TD-06 |
| Monitoring | pino log + traceId | Log aggregasi + alert (Sentry/ErrorBoundary + uptime) | SE-04 |
| Backup | — | Postgres PITR + object storage versioning + test restore bulanan | TD-15 |

## AI Engine — detail (diimplementasikan F1/F2, 2026-08-09)

Alur pemrosesan satu dokumen (`src/server/pipeline.ts` → worker):

```
Upload (PDF/JPG/XLSX)
  → parseDocument (src/ai/parsers.ts)
      ├─ PDF   → pdf-parse (teks) — tanpa LLM, gratis
      ├─ XLSX  → sheet → baris teks — tanpa LLM, gratis
      └─ JPG   → visionCompletion → GLM-4V-Flash (gratis OCR)
  → draftJournalFromText (src/ai/drafting.ts)
      ├─ rule-engine dulu (deterministik, confidence)
      └─ jika confidence < 0.6 → chatJsonWithFallback
           ├─ GLM-4-Flash (gratis) ← default
           └─ gagal network/parse → GLM-4.6 (retry sekali)
  → validateDraftLines (balance debit=kredit, COA valid)
  → JournalEntry DRAFT / EXCEPTION + ActivityLog
```

**Model routing (`src/ai/llm.ts`):**

| Fungsi | Model default (z.ai) | Model (bigmodel.cn) | Env override |
|---|---|---|---|
| Draft jurnal (teks) | `glm-4.5-air` (murah) | `glm-4-flash` **gratis** | `LLM_MODEL` |
| OCR gambar (JPG) | `glm-4.5` (multimodal) | `glm-4v-flash` **gratis** | `LLM_VISION_MODEL` |
| Retry kualitas | `glm-4.6` | `glm-4.6` | `LLM_STRONG_MODEL` |

> **Catatan platform (2026-08-10):** model `-flash` gratis hanya di bigmodel.cn (portal China,
> butuh pendaftaran lokal). Z.ai internasional: `glm-4.5-air` paling hemat; butuh saldo
> (429 `Insufficient balance` jika kosong). Model apa pun bisa diganti lewat env — tanpa
> API key sama sekali, app tetap berfungsi penuh via rule engine (fallback deterministik).

**Strategi biaya:** flash untuk semua dokumen rutin → cost AI per dokumen mendekati nol (GLM-4-Flash free tier). Strong model hanya terpakai saat flash gagal. Tanpa API key sama sekali, app tetap berfungsi penuh via rule engine (fallback terakhir) — tidak ada single point of failure ke vendor.

**Env:** `GLM_API_KEY` (baru, prioritas) + `GLM_BASE_URL`; `LLM_API_KEY`/`LLM_BASE_URL` tetap dibaca untuk backward-compat. Test: `tests/llm.test.ts` (11 kasus — config default, routing model, fallback ganda, strip fence).

## Keputusan yang dibutuhkan (owner: Rama)

1. **Cloud provider / akun**: AWS / GCP / Vercel+Neon / self-host? Menentukan RDS vs Neon, S3 vs R2, Secret Manager vs Vault.
2. **Domain & deployment**: domain produksi, staging, metode deploy (Vercel / container / VPS).
3. **Budget tier**: estimasi volume (30 firma × 30 klien × 400 tx/bln) untuk pilih tier.
4. **Retensi data**: berapa lama dokumen klien disimpan setelah kontrak berakhir (regulasi & kebijakan firma).

## Checklist implementasi (setelah keputusan)

- [x] Backup: Postgres PITR + prosedur restore terdokumentasi (`infra/backup-restore.md`, F-2) — drill bulanan masih manual
- [x] IaC-lite: spesifikasi layanan Railway + env referensi (`infra/railway-services.md`, F-4) — Terraform penuh tersisa
- [ ] Abstraksi storage: `src/lib/storage.ts` → interface + impl filesystem (dev) & object storage (prod) — kode sudah siap di-refactor
- [ ] Key rotation: dukung `STORAGE_ENCRYPTION_KEY_<version>` + re-encrypt on rotate
- [ ] IaC: konfigurasi Redis/Postgres/storage sebagai kode (Terraform/OpenTofu) — ganti `redis.conf` manual
- [ ] Monitoring: health check (sudah `/api/health`) + alert SLA breach ke email (TD-14, lanjutan EN-05 F2)

## Catatan keamanan

- HSTS aktif otomatis saat `NODE_ENV=production` (F0).
- Dokumen upload: magic bytes + ukuran + MIME + sanitasi nama (sudah, SE-02) — virus scan opsional saat object storage dipasang.
- Jangan commit `.env`; secret scanning di CI (SE-06) — gate npm audit masih `continue-on-error`.

## Praktis — Production Demo (Railway, 2026-08-13)

- **Web**: https://web-production-7a593.up.railway.app (service `web`, region Southeast Asia)
- **Worker pipeline**: service `worker` (BullMQ, `npx tsx src/server/pipeline-worker.ts` via `WORKER_MODE=1`)
- **Postgres 16** + **Redis**: Railway plugins (private network `*.railway.internal`)
- **Volume**: `web-volume` → `/app/uploads` (dokumen terenkripsi AES-256-GCM)
- **Deploy**: `railway up -d -y` (Dockerfile multi-stage; `prisma migrate deploy` tiap boot; `output: standalone`)
- **Login demo**: `admin@ledgerline.dev` / `password123` (seed via `railway ssh -s web "cd /app && npx prisma db seed"`)
- **Pelajaran**: (1) plugin Postgres/Redis TIDAK auto-inject `DATABASE_URL`/`REDIS_URL` ke service — set manual; (2) `railway run` jalan lokal → tak bisa akses host private; seed via SSH ke container; (3) `RAILWAY_START_COMMAND` tidak efektif → pakai `WORKER_MODE` env + branch di CMD Dockerfile; (4) SSH host key berubah tiap deploy → `railway ssh config` + `ssh -o StrictHostKeyChecking=accept-new railway-web`.

## Pipeline OCR Berlapis (2026-08-14) — OCR internal dulu, AI sebagai fallback

- **Lokal (gratis)**: tesseract.js wasm, bahasa `ind+eng` (tessdata_fast 2,6MB di `src/ai/tessdata/`, worker singleton di `src/ai/local-ocr.ts`) — untuk gambar (JPG/PNG) & PDF scan (render halaman via mupdf → PNG → OCR lokal).
- **Fallback vision LLM** (mode `auto`, default): hanya saat hasil lokal jelek (`looksLikeFailedOcr`) atau `OCR_ENGINE=vision`.
- **Env**: `OCR_ENGINE=auto|local|vision` (default `auto`).
- **Verifikasi**: tesseract.js jalan di Node ESM (tsx lokal hang — quirk tooling, bukan runtime); unit test 371/371 (mock local-ocr); build OK; **terbukti di container Railway** (OCR faktur lengkap tanpa LLM).
- **Dampak biaya**: mayoritas dokumen selesai di OCR lokal (gratis) — LLM vision & strong model hanya cadangan; GLM hanya dipakai utk drafting jurnal.
- Catatan: PaddleOCR/EasyOCR (referensi user) butuh Python+PyTorch — tidak praktis di container Node; tesseract.js wasm mencapai tujuan sama (OCR khusus sebelum AI) dengan footprint kecil.

## Observability Metrik OCR Hybrid (2026-08-14)

- Tabel `OcrMetric` (firmId, engine, usedVision/Strong, pageCount, durationMs, textChars, estTokens, estCostUsd) — ditulis pipeline tiap dokumen (non-kritis: gagal catat ≠ gagal pipeline).
- Estimasi biaya: `src/lib/ocr-cost.ts` (pure) — vision ±1.200 token/halaman @ glm-4.5 $0,7/M, strong $2,8/M, teks ±0,25 token/karakter; OCR lokal = $0.
- API `GET /api/metrics/ocr?days=30` (Admin/Senior) → fallback rate, strong rate, avg duration, biaya, seri per hari.
- UI: panel "Metrik OCR Hybrid" di halaman Metrik Kualitas (`/dashboard/quality`).
- E2E `scripts/e2e-ocr-metrics.ts` PASS di prod. Chromium path berubah: chromium-1234 (`chrome-mac-arm64/Google Chrome for Testing`).

## Fix Worker Storage — berbagi file upload antar service (2026-08-15)

- **Masalah**: Railway volume (`web-volume`) hanya bisa di-mount ke SATU service. Upload disimpan di web (filesystem), worker di container terpisah → ENOENT saat baca file.
- **Solusi**: worker ambil file dari web via HTTP internal ber-token:
  - `src/app/api/internal/files/[...path]/route.ts` — return file mentah (terenkripsi), cek header `x-internal-token`.
  - `src/lib/storage.ts` `readStoredFile` — saat `WORKER_MODE=1` fetch dari `WEB_INTERNAL_URL`, lalu dekripsi.
  - Env baru (web & worker): `STORAGE_INTERNAL_TOKEN`, `WEB_INTERNAL_URL`.
- **Bug path**: endpoint harus strip prefix `uploads` (cocok dgn `absolutePath`) — awalnya double-prefix `uploads/uploads/...` → 404.
- **Verifikasi**: upload invoice → PROCESSED, ocrMetric engine=pdf-text, jurnal 1 entry/3 baris DRAFT, estCostUsd=0.
