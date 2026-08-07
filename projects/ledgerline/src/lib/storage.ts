import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sanitizeFileName } from "@/server/documents";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

/**
 * Simpan buffer upload ke `uploads/{clientId}/{id}-{namaAman}` (dev: filesystem).
 * Return path relatif terhadap root proyek.
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
  await writeFile(path.join(UPLOAD_ROOT, relative.replace(/^uploads[\\/]/, "")), opts.buffer);
  return relative;
}
