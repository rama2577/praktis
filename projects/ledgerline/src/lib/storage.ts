/**
 * Lapisan penyimpanan dokumen — API publik (F-1 / TD-04).
 *
 * `saveUpload` / `readStoredFile` menjaga kontrak yang sama bagi pemanggil,
 * sementara backend fisik dipilih via `STORAGE_DRIVER`:
 *   - `filesystem` (default): `uploads/` lokal (dev/demo), terenkripsi at-rest.
 *   - `s3`: object storage S3-compatible (R2 / S3 / MinIO).
 *
 * Enkripsi AES-256-GCM (AES-256-GCM) selalu diterapkan DI ATAS driver, sehingga
 * data terenkripsi at-rest apa pun backend-nya.
 */
import { sanitizeFileName } from "@/server/documents";
import { decryptBuffer, encryptBuffer } from "@/lib/crypto";
import { resolveStorageDriverName, type StorageDriver } from "./storage/types";
import { FilesystemDriver } from "./storage/filesystem";

let driver: StorageDriver | null = null;
let driverName: "filesystem" | "s3" | null = null;

async function getDriver(): Promise<StorageDriver> {
  const name = resolveStorageDriverName();
  if (driver && driverName === name) return driver;
  if (name === "s3") {
    const { S3Driver } = await import("./storage/s3");
    driver = new S3Driver();
  } else {
    driver = new FilesystemDriver();
  }
  driverName = name;
  return driver;
}

/**
 * Simpan buffer upload → key relatif `uploads/{clientId}/{id}-{namaAman}`,
 * TERENKRIPSI AES-256-GCM. Return key (disimpan ke `Document.filePath`).
 */
export async function saveUpload(opts: {
  id: string;
  clientId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<string> {
  const safeName = sanitizeFileName(opts.fileName);
  const key = `uploads/${opts.clientId}/${opts.id}-${safeName}`;
  const d = await getDriver();
  await d.save(key, encryptBuffer(opts.buffer));
  return key;
}

/** Baca file tersimpan lalu dekripsi. Lempar error jika key salah / file rusak. */
export async function readStoredFile(relativePath: string): Promise<Buffer> {
  const d = await getDriver();
  const raw = await d.read(relativePath);
  return decryptBuffer(raw);
}
