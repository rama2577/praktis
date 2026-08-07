import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sanitizeFileName } from "@/server/documents";
import { decryptBuffer, encryptBuffer } from "@/lib/crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function absolutePath(relative: string): string {
  return path.join(UPLOAD_ROOT, relative.replace(/^uploads[\\/]/, ""));
}

/**
 * Simpan buffer upload ke `uploads/{clientId}/{id}-{namaAman}` (dev: filesystem),
 * TERENKRIPSI AES-256-GCM (enkripsi at-rest). Return path relatif.
 */
export async function saveUpload(opts: {
  id: string;
  clientId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, opts.clientId);
  await mkdir(dir, { recursive: true });

  const safeName = sanitizeFileName(opts.fileName);
  const relative = path.join("uploads", opts.clientId, `${opts.id}-${safeName}`);
  await writeFile(absolutePath(relative), encryptBuffer(opts.buffer));
  return relative;
}

/** Baca file tersimpan lalu dekripsi. Melempar error jika key salah / file rusak. */
export async function readStoredFile(relativePath: string): Promise<Buffer> {
  const raw = await readFile(absolutePath(relativePath));
  return decryptBuffer(raw);
}
