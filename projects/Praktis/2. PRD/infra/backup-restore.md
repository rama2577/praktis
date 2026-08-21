# Backup & Restore — Praktis (F-2)

> F-2 (2026-08-16) — runbook backup/restore produksi. Menjawab TD-15.

## Sumber backup

| Sumber | Frekuensi | Catatan |
|---|---|---|
| **Railway Postgres built-in** (utama) | otomatis harian + PITR | Aktif default di plugin Postgres. Retention default 7 hari (naikkan untuk data sensitif). |
| **Manual pg_dump** (opsional) | sebelum migrasi besar / audit | Lihat prosedur di bawah. |

## Verifikasi backup otomatis

1. Railway dashboard → project `praktis-demo` → **Postgres** → tab **Backups**.
2. Pastikan ada backup harian & **Point-in-time recovery (PITR)** aktif.
3. Uji restore minimal 1×/bulan (drill di bawah).

## Manual backup (pg_dump)

Butuh koneksi Postgres dari luar container. Railway Postgres punya **Public URL**
(dashboard → Postgres → Connect → `DATABASE_PUBLIC_URL`, protokol TCP proxy).

```bash
# Opsi A — public URL (pastikan DATABASE_PUBLIC_URL sudah di-copy dari dashboard)
pg_dump "$DATABASE_PUBLIC_URL" -Fc -f "backup-$(date +%F).dump"

# Opsi B — proxy sementara (jika public URL tidak diaktifkan)
#   terminal 1: railway connect postgres   (membuka proxy lokal)
#   terminal 2:
pg_dump "postgresql://<user>:<pass>@localhost:<port>/<db>" -Fc -f "backup-$(date +%F).dump"
```

## Restore

```bash
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" "backup-YYYY-MM-DD.dump"
```

⚠️ Restore overwrite data — lakukan ke DB staging, bukan langsung ke produksi,
kecuali pada skenario disaster-recovery yang disengaja.

## Drill bulanan (TD-15)

1. Ambil backup terbaru (dashboard atau `pg_dump` manual).
2. Restore ke DB staging/container lokal.
3. Validasi row count tabel kunci:
   ```sql
   SELECT count(*) FROM "JournalEntry";
   SELECT count(*) FROM "Client";
   SELECT count(*) FROM "User";
   ```
4. Catat hasil + durasi di `memory/` (hasil drill).
