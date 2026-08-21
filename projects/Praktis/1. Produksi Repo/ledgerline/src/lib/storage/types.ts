/**
 * Abstraksi penyimpanan dokumen (F-1 / TD-04).
 *
 * Driver menerima/ mengembalikan BYTE TERENKRIPSI — enkripsi AES-256-GCM tetap
 * dilakukan di lapisan atas (`src/lib/storage.ts`), sehingga data terenkripsi
 * at-rest apa pun driver-nya.
 *
 * `key` = path relatif `uploads/{clientId}/{id}-{namaAman}` (konsisten dengan
 * `Document.filePath` di DB, sehingga pindah driver tidak mengubah data).
 */
export interface StorageDriver {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

/** Nama driver aktif dari env. Default filesystem (dev/demo). */
export function resolveStorageDriverName(
  env: Record<string, string | undefined> = process.env,
): "filesystem" | "s3" {
  return env.STORAGE_DRIVER === "s3" ? "s3" : "filesystem";
}
