# Plan GA — Praktis (LedgerLine) Menuju Komersial

> Status: core app **selesai** (OCR hybrid, enhancement Fase 0–3, RBAC 5 segmen,
> billing model kuota, storage abstraction, feedback loop AI, Playwright + SAST).
> Dokumen ini mendaftar **gap yang tersisa** sebelum bisa berjalan komersial (GA),
> diprioritaskan. Update terakhir: 2026-08-16.

## P0 — Blocker (harus selesai sebelum terima revenue / multi-firma produksi)

1. **Payment + invoicing** — saat ini billing hanya flag (`BILLING_ENFORCE`) +
   counter kuota (`UsageMeter`), belum ada penagihan nyata. Butuh integrasi
   payment gateway (Midtrans/Xendit) + lifecycle subscription (bulanan/tahunan)
   + invoice & reminder. Tanpa ini tidak bisa collect revenue.
2. **Onboarding / provisioning tenant** — firma & user masih di-*seed* manual.
   Butuh flow signup/invite (atau minimal admin provisioning) untuk membuat
   firma baru + user + role + segmen.
3. **Multi-tenant isolation audit** — sudah ada `tenant.ts` + middleware, tapi
   sebelum komersial perlu audit/pen-test akses silang tenant (firma A tidak
   boleh baca data firma B) di semua route API + file upload.
4. **Kredensial demo** — rotasi `password123` → `DEMO_PASSWORD` kuat +
   `reset-demo-password.ts`, dan nonaktifkan/hapus akun & data demo di produksi
   (ditahan sampai POC selesai).
5. **CI/CD jadi gate nyata** — workflow ada di `projects/ledgerline/.github/workflows/ci.yml`,
   tapi GitHub Actions hanya membaca `.github/workflows/` di **root repo**
   (`rama2577/praktis`). Akibatnya CI **belum pernah jalan** (0 run). Perlu
   pindahkan ke root + `working-directory: projects/ledgerline`, lalu jadikan
   gitleaks/Semgrep/unit test/build/E2E sebagai gate merge.
6. **Secret manager** (F-3 final) — `STORAGE_ENCRYPTION_KEY` masih env statis.
   Pindah ke secret manager (Vault/Doppler/AWS Secrets Manager) + rotasi otomatis.
7. **Object storage aktif** — `STORAGE_DRIVER=s3` (R2/S3/MinIO) sudah tersedia tapi
   belum dipakai; aktifkan agar upload dokumen durable + shared antara web & worker.
8. **Backup otomatis** — runbook `infra/backup-restore.md` ada, tapi perlu
   jadwal PITR/`pg_dump` terjadwal + restore drill bulanan + verifikasi restorasi.

## P1 — Penting (segera setelah GA)

9. **Observability** — Sentry + log aggregation + uptime alerting (saat ini hanya
   `logger` internal). Wajib untuk deteksi error produksi secara proaktif.
10. **Uji billing end-to-end** — `BILLING_ENFORCE=true` di staging, verifikasi
    over-quota Rp350/tx + gate SPT 1771 berjalan benar sebelum diaktifkan di produksi.
11. **Email/notifikasi produksi** — sambungkan email provider nyata (Resend/SES)
    untuk notifikasi portal klien + outbox (email.ts sudah ada, provider masih mock).
12. **DJP Core Tax integration** — e-Faktur/e-Bupot API untuk segmen konsultan
    pajak (nilai jual utama segmen #2).

## P2 — Tech debt (bayar bertahap, tidak blocking)

13. **P-7 · TanStack Query/SWR** — bayar utang lint `set-state-in-effect`
    (pola fetch-on-mount + refetch), sekalian perbaiki perf & caching.
14. **P-1 lanjutan · auto-apply rule** — feedback loop saat ini *suggestion-only*;
    pertimbangkan opsi "approve → update rule/template" semi-otomatis.
15. **Security gates naik level** — gitleaks + Semgrep + `npm audit` dari
    `continue-on-error` jadi gate setelah daftar temuan bersih.

## Non-kode (bisnis/legal)

16. **Terms of Service + Privacy Policy + DPA** — perjanjian pemrosesan data
    untuk firma (data klien = data pihak ketiga).
17. **Pricing final + payment terms + rencana POC→GA cutover** — termasuk
    penentuan provider object storage & secret manager (keputusan masih terbuka).

## Sudah selesai (referensi cepat)

- OCR hybrid + metrik OCR · enhancement Fase 0–3 (command bar AI, auto-translate,
  parse QR e-Faktur, deadline, agent proaktif, jurnal rutin).
- RBAC multi-segmen (5 segmen) + sidebar segment-aware.
- Billing model kuota (Mikro/Low/Middle, bulanan & tahunan, over-quota Rp350/tx) +
  paywall SPT via `annualPaidAt`.
- Storage abstraction (filesystem + S3 driver) + enkripsi AES-256-GCM + rotasi kunci.
- Feedback loop AI (P-1) — saran perbaikan aturan dari pola koreksi.
- Playwright smoke E2E + Semgrep SAST (P-6) — *belum jalan di CI, lihat P0 #5*.
- Runbook backup/restore, key-rotation, railway-services.
