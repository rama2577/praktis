/**
 * F-3 — Rotasi kunci enkripsi at-rest (filesystem driver).
 *
 * Re-encrypt semua dokumen di `uploads/` dari kunci LAMA ke kunci AKTIF.
 * Idempoten: file yang sudah ter-enkripsi dengan kunci aktif = no-op.
 *
 * Prosedur:
 *   1) Set env: STORAGE_ENCRYPTION_KEY=<hex baru> · STORAGE_ENCRYPTION_KEY_PREVIOUS=<hex lama>
 *   2) Jalankan: npx tsx --env-file=.env scripts/rotate-storage-key.ts
 *   3) Semua `ok`, 0 `gagal` → aman hapus STORAGE_ENCRYPTION_KEY_PREVIOUS.
 *
 * (Driver s3: rotasi bisa lewat list object → re-encrypt; belum diimplementasi.)
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { decryptBuffer, encryptBuffer } from "../src/lib/crypto";

const ROOT = path.join(process.cwd(), "uploads");

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

(async () => {
  try {
    await stat(ROOT);
  } catch {
    console.log("uploads/ tidak ditemukan — tidak ada yang dirotasi.");
    return;
  }

  let ok = 0;
  let fail = 0;
  for await (const file of walk(ROOT)) {
    try {
      const encrypted = await readFile(file);
      const plain = decryptBuffer(encrypted); // aktif dulu → lalu kunci lama
      await writeFile(file, encryptBuffer(plain)); // enkripsi ulang dgn kunci aktif
      ok++;
    } catch (e) {
      fail++;
      console.error(`gagal ${file}: ${(e as Error).message}`);
    }
  }
  console.log(`rotasi selesai: ${ok} ok, ${fail} gagal.`);
  if (fail > 0) process.exit(1);
})();
