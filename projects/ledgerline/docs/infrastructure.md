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

| Fungsi | Model default | Biaya | Env override |
|---|---|---|---|
| Draft jurnal (teks) | `glm-4-flash` | **gratis** | `LLM_MODEL` |
| OCR gambar (JPG) | `glm-4v-flash` | **gratis** | `LLM_VISION_MODEL` |
| Retry kualitas | `glm-4.6` | berbayar (hemat) | `LLM_STRONG_MODEL` |

**Strategi biaya:** flash untuk semua dokumen rutin → cost AI per dokumen mendekati nol (GLM-4-Flash free tier). Strong model hanya terpakai saat flash gagal. Tanpa API key sama sekali, app tetap berfungsi penuh via rule engine (fallback terakhir) — tidak ada single point of failure ke vendor.

**Env:** `GLM_API_KEY` (baru, prioritas) + `GLM_BASE_URL`; `LLM_API_KEY`/`LLM_BASE_URL` tetap dibaca untuk backward-compat. Test: `tests/llm.test.ts` (11 kasus — config default, routing model, fallback ganda, strip fence).

## Keputusan yang dibutuhkan (owner: Rama)

1. **Cloud provider / akun**: AWS / GCP / Vercel+Neon / self-host? Menentukan RDS vs Neon, S3 vs R2, Secret Manager vs Vault.
2. **Domain & deployment**: domain produksi, staging, metode deploy (Vercel / container / VPS).
3. **Budget tier**: estimasi volume (30 firma × 30 klien × 400 tx/bln) untuk pilih tier.
4. **Retensi data**: berapa lama dokumen klien disimpan setelah kontrak berakhir (regulasi & kebijakan firma).

## Checklist implementasi (setelah keputusan)

- [ ] Abstraksi storage: `src/lib/storage.ts` → interface + impl filesystem (dev) & object storage (prod) — kode sudah siap di-refactor
- [ ] Env schema produksi: `DATABASE_URL`, `REDIS_URL`, `STORAGE_DRIVER`, `STORAGE_*`, `SECRETS_*` — satu sumber di secret manager
- [ ] Backup: Postgres PITR + object versioning + prosedur restore teruji (drill bulanan)
- [ ] Key rotation: dukung `STORAGE_ENCRYPTION_KEY_<version>` + re-encrypt on rotate
- [ ] IaC: konfigurasi Redis/Postgres/storage sebagai kode (Terraform/OpenTofu) — ganti `redis.conf` manual
- [ ] Monitoring: health check (sudah `/api/health`) + alert SLA breach ke email (TD-14, lanjutan EN-05 F2)

## Catatan keamanan

- HSTS aktif otomatis saat `NODE_ENV=production` (F0).
- Dokumen upload: magic bytes + ukuran + MIME + sanitasi nama (sudah, SE-02) — virus scan opsional saat object storage dipasang.
- Jangan commit `.env`; secret scanning di CI (SE-06) — gate npm audit masih `continue-on-error`.
