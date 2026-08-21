# Rotasi Kunci Enkripsi — Praktis (F-3)

> F-3 (2026-08-16) — prosedur rotasi `STORAGE_ENCRYPTION_KEY`. Menjawab TD-05.
> Enkripsi at-rest dokumen = AES-256-GCM (lihat `src/lib/crypto.ts`).

## Prinsip

- Enkripsi selalu memakai kunci **aktif** (`STORAGE_ENCRYPTION_KEY`).
- Dekripsi mencoba kunci aktif, lalu daftar kunci **lama** (`STORAGE_ENCRYPTION_KEY_PREVIOUS`, pisah koma).
- Rotasi = ganti kunci aktif + simpan kunci lama → re-encrypt bertahap → hapus kunci lama.

## Prosedur rotasi (filesystem driver)

1. Generate kunci baru:
   ```bash
   openssl rand -hex 32
   ```
2. Set env (Railway → service `web` + `worker`):
   ```
   STORAGE_ENCRYPTION_KEY=<hex BARU>
   STORAGE_ENCRYPTION_KEY_PREVIOUS=<hex LAMA>
   ```
   (Bila ada >1 kunci lama yang masih dipakai: pisah koma.)
3. Redeploy (app kini mengenkripsi dgn kunci baru, tetap bisa baca data lama).
4. Re-encrypt seluruh dokumen:
   ```bash
   # via container web (filesystem driver):
   railway ssh -s web "cd /app && npx tsx --env-file=.env scripts/rotate-storage-key.ts"
   ```
   ⚠️ `scripts/` TIDAK ikut container (hanya `prisma/` + `src/`) — jalankan via
   `railway ssh` dengan menyalin script, atau re-encrypt lewat mekanisme lain
   (lihat catatan di bawah).
5. Verifikasi: output `N ok, 0 gagal`.
6. Hapus `STORAGE_ENCRYPTION_KEY_PREVIOUS` → redeploy.

## Catatan

- **Driver s3**: rotasi dilakukan lewat list object → re-encrypt per object.
  Belum diimplementasi di `scripts/rotate-storage-key.ts` (baru filesystem).
- **Secret manager** (AWS Secrets Manager / Vault / Doppler): bagian "pindah
  kunci ke secret manager" masih menunggu keputusan provider. Mekanisme rotasi
  di atas sudah siap — saat provider dipilih, tinggal injeksi nilai kunci dari
  secret manager ke env, prosedur re-encrypt sama.
- **Jangan hapus kunci lama sebelum semua data ter-re-encrypt** — data yang
  masih ter-enkripsi kunci lama akan gagal didekripsi.
