# Plan GA — Deployment & Infrastruktur Praktis (LedgerLine)

> Disusun 2026-08-18. Melengkapi `tasks/plan-ga.md` (gap kode/komersial) dengan
> keputusan **di mana & bagaimana** deploy Praktis untuk GA, plus anggaran.

---

## 1. Rekomendasi Hosting (keputusan)

**Rekomendasi: Railway (Hobby $5/bulan) sebagai host GA Praktis** + Cloudflare R2
untuk object storage + Cloudflare untuk DNS/domain.

**Alasan singkat:**
1. Praktis = SaaS pembukuan yang menyimpan **data keuangan klien**. Prioritas
   infra #1 adalah **backup database otomatis + PITR** yang terkelola — Railway
   Postgres menyediakan ini tanpa kamu jadi sysadmin.
2. **Sudah jalan** di Railway (demo live `web-production-7a593.up.railway.app`) →
   nol biaya migrasi.
3. Selisih biaya vs self-host hanya ~$5–10/bulan = "asuransi" murah untuk produk
   berbayar.

**Alternatif hemat (kalau harus tekan semua biaya):** self-host di Contabo via
Coolify. Lihat §3 untuk rincian & risikonya.

**Vercel: skip** untuk app ini — Vercel tidak menghosting Postgres/Redis/worker.
Memakainya berarti memecah stack (Neon/Supabase + Upstash + VPS worker) dan
totalnya lebih mahal + lebih ribet.

---

## 2. Anggaran (estimasi, USD)

| Item | Opsi A: Railway (rekom.) | Opsi B: Contabo self-host |
|---|---|---|
| Hosting app (web+worker) | $5/bulan (Hobby, incl. $5 usage) | $0 (VPS sudah dibayar) |
| PostgreSQL | ~$1–3/bulan (metered) | $0 (container sendiri) |
| Redis | ~$1–2/bulan (metered) | $0 (container sendiri) |
| Object storage (upload) | Cloudflare R2 **free 10GB** | R2 free 10GB |
| Block storage tambahan | — | ~$5/bulan (disk Contabo 89% penuh) |
| **Hosting total** | **~$7–10/bulan** | **~$5–6/bulan** |
| Domain (.com, Cloudflare/Porkbun at-cost) | ~$10–12/**tahun** | sama |
| Email transaksional (Resend/SES) | ~$0 (free tier) | sama |
| Monitoring (Sentry) | ~$0 (free tier) | sama |

- **Opsi A ≈ Rp 110–170rb/bulan** (hosting + domain diprorata).
- **Opsi B ≈ Rp 85–110rb/bulan**, tapi + waktu ops-mu + risiko (lihat §3).

> Catatan: angka Railway Postgres/Redis adalah *estimasi* untuk trafik GA awal
> (sedikit klien). Naik seiring volume data.

---

## 3. Detail per opsi hosting

### Opsi A — Railway (rekomendasi)
- **Sudah aktif**: project `praktis-demo`, service `web` + `worker` (BullMQ),
  plugin Postgres + Redis.
- **Yang perlu dilakukan**: (1) aktifkan `STORAGE_DRIVER=s3` → R2, (2) set
  `BILLING_ENFORCE=true` di staging dulu, (3) ganti plan ke Hobby + pasang kartu,
  (4) pindah ke domain sendiri.
- **Kelebihan**: backup Postgres otomatis + PITR, deploy `railway up` simpel,
  scaling per-service, zero-ops.
- **Kekurangan**: biaya metered (bisa naik pelan), lock-in Railway.

### Opsi B — Contabo + Coolify (self-host, hemat)
- **Fakta VPS saat ini** (cek 2026-08-18): RAM 7.8GB (6.2GB free), 4 vCPU,
  **disk 96GB → 85GB terpakai (12GB free, 89%)**. Sudah jalan Coolify 4.3.7 +
  Mio ERP (web + worker + redis).
- **Bisa** tambah Praktis? **Ya** secara RAM/CPU. **Kendala: disk tinggal 12GB.**
- **Syarat aman**: tambah block storage (~$5/bulan) ATAU eksternalisasi upload ke
  R2 + `docker system prune` rutin untuk gambar/log lama.
- **Kelebihan**: hosting $0 tambahan, kontrol penuh.
- **Kekurangan/risiko**: kamu = sysadmin (backup pg_dump terjadwal + restore
  drill + hardening + update OS), single-point-of-failure, **berbagi resource
  dengan Mio ERP** (spike Mio ERP bisa menurunkan Praktis, dan sebaliknya), tanpa
  PITR terkelola.

---

## 4. Rencana kerja menuju GA (fase)

### Fase 0 — Infra & keputusan (minggu ini)
- [ ] Pilih host (rekomendasi: Railway Hobby).
- [ ] Beli domain + arahkan DNS ke Cloudflare (SSL Let's Encrypt gratis).
- [ ] Aktifkan object storage `STORAGE_DRIVER=s3` → **Cloudflare R2** (P0 #7).
- [ ] Pindahkan `STORAGE_ENCRYPTION_KEY` ke secret manager (Doppler free / env
      ter-enkripsi) — P0 #6.
- [ ] Jadwalkan backup: Railway Postgres otomatis + `pg_dump` harian ke R2 (P0 #8).

### Fase 1 — Legal & komersial (P0)
- [ ] Terms of Service + Privacy Policy + DPA (data klien = data pihak ketiga).
- [ ] Integrasi payment gateway (**Midtrans** — paling umum di ID) + lifecycle
      subscription (bulanan/tahunan) + invoice & reminder (P0 #1).
- [ ] Finalisasi pricing & payment terms (kuota sudah final; tinggal eksekusi).

### Fase 2 — Hardening produk (P0)
- [ ] Onboarding/provisioning tenant: flow signup/invite (P0 #2).
- [ ] Audit multi-tenant isolation: pen-test akses silang firma (P0 #3).
- [ ] Rotasi kredensial demo (`password123` → `DEMO_PASSWORD`) + hapus data demo
      produksi (P0 #4).
- [ ] Pindahkan CI/CD ke root repo `.github/workflows/` + `working-directory`
      (P0 #5) → jadikan gate merge.

### Fase 3 — Observability & ops (P1)
- [ ] Sentry + log aggregation + uptime alerting (P1 #9).
- [ ] Sambungkan email provider nyata Resend/SES untuk notifikasi portal (P1 #11).
- [ ] Uji billing E2E: `BILLING_ENFORCE=true` di staging, verifikasi over-quota
      Rp350/tx + gate SPT 1771 (P1 #10).

### Fase 4 — Go-live
- [ ] Cutover POC→GA, hapus/migrasi data demo, go-live domain resmi.
- [ ] Monitoring 24/48 jam pertama + feedback loop.

---

## 5. Domain (biaya nyata)

- **`.com`** via **Cloudflare Registrar** (at-cost, ~$10–11/tahun) atau **Porkbun**
  (~$10/tahun) → paling murah + fleksibel.
- **`.id` / `.co.id`** via registrar lokal terakreditasi PANDI (Niagahoster/
  IDCloudHost/Dewaweb) ~**Rp 150–400rb/tahun** → lebih "lokal/terpercaya" di mata
  firma akuntansi Indonesia, tapi Cloudflare Registrar tidak jual `.id`.
- Saran: mulai dengan `.com` (hemat), pertimbangkan `.id` saat brand sudah jalan.

---

## 6. Checklist keputusan yang butuh input kamu

1. Host final: Railway (rekom.) atau Contabo self-host?
2. Domain: `.com` murah atau `.id` untuk trust lokal?
3. Payment gateway: Midtrans (rekom.) atau Xendit?
4. Secret manager: Doppler free, atau cukup env ter-enkripsi dulu?
