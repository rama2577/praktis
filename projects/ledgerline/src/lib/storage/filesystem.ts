/**
 * Driver filesystem — dev/demo. Simpan file terenkripsi ke `uploads/`.
 *
 * Di service worker (WORKER_MODE=1), file dibaca dari service web via HTTP
 * internal (token), karena worker & web tidak berbagi filesystem di Railway.
 * (Untuk object storage, gunakan S3Driver yang sudah shared-service — tidak
 * perlu mekanisme internal fetch ini.)
 */
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./types";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function absolutePath(key: string): string {
  return path.join(UPLOAD_ROOT, key.replace(/^uploads[\\/]/, ""));
}

export class FilesystemDriver implements StorageDriver {
  async save(key: string, data: Buffer): Promise<void> {
    const abs = absolutePath(key);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, data);
  }

  async read(key: string): Promise<Buffer> {
    if (process.env.WORKER_MODE === "1") {
      const base = process.env.WEB_INTERNAL_URL ?? "";
      const token = process.env.STORAGE_INTERNAL_TOKEN ?? "";
      if (!base || !token) {
        throw new Error(
          "worker storage misconfigured: WEB_INTERNAL_URL & STORAGE_INTERNAL_TOKEN wajib di-set",
        );
      }
      const encoded = key.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(`${base.replace(/\/$/, "")}/api/internal/files/${encoded}`, {
        headers: { "x-internal-token": token },
      });
      if (!res.ok) throw new Error(`worker fetch file ${key}: HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    }
    return readFile(absolutePath(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(absolutePath(key)).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}
