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

/** Baca file tersimpan lalu dekripsi. Melempar error jika key salah / file rusak.
 *  Di service worker (WORKER_MODE=1), file dibaca dari web service via HTTP
 *  internal (token), karena worker & web tidak berbagi filesystem di Railway. */
export async function readStoredFile(relativePath: string): Promise<Buffer> {
  if (process.env.WORKER_MODE === "1") {
    const base = process.env.WEB_INTERNAL_URL ?? "";
    const token = process.env.STORAGE_INTERNAL_TOKEN ?? "";
    if (!base || !token) {
      throw new Error("worker storage misconfigured: WEB_INTERNAL_URL & STORAGE_INTERNAL_TOKEN wajib di-set");
    }
    const encoded = relativePath.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(`${base.replace(/\/$/, "")}/api/internal/files/${encoded}`, {
      headers: { "x-internal-token": token },
    });
    if (!res.ok) throw new Error(`worker fetch file ${relativePath}: HTTP ${res.status}`);
    const raw = Buffer.from(await res.arrayBuffer());
    return decryptBuffer(raw);
  }
  const raw = await readFile(absolutePath(relativePath));
  return decryptBuffer(raw);
}
