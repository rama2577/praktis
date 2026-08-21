import { createHash } from "node:crypto";

// ── Konstanta & deteksi tipe file ────────────────────────────────────────

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const UPLOAD_EXTENSIONS = ["pdf", "jpg", "jpeg", "xlsx"] as const;
export type UploadExtension = (typeof UPLOAD_EXTENSIONS)[number];

export const UPLOAD_MIME_TYPES: Record<UploadExtension, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};

/** Magic bytes per ekstensi (cek integritas isi file, bukan hanya nama). */
const MAGIC_BYTES: Record<UploadExtension, (b: Buffer) => boolean> = {
  pdf: (b) => b.length >= 4 && b.subarray(0, 4).toString("latin1") === "%PDF",
  jpg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  xlsx: (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04, // "PK\x03\x04" (ZIP)
};

export type UploadErrors = Partial<Record<"file", string>>;

/** Ekstensi file dari nama file (lowercase, tanpa titik). */
export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}

/** Ambil ekstensi yang diizinkan dari nama file (null jika tidak dikenali). */
export function detectUploadExtension(fileName: string): UploadExtension | null {
  const ext = getExtension(fileName);
  if (ext === "jpeg") return "jpeg";
  if (ext === "jpg") return "jpg";
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx") return "xlsx";
  return null;
}

/**
 * Validasi file upload: ekstensi, MIME, ukuran, dan magic bytes.
 * Return { ok: true } atau { ok: false, errors }.
 */
export function validateUploadFile(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): { ok: true } | { ok: false; errors: UploadErrors } {
  const ext = detectUploadExtension(fileName);
  if (!ext) {
    return {
      ok: false,
      errors: { file: "Format tidak didukung. Gunakan PDF, JPG, atau XLSX." },
    };
  }

  if (!UPLOAD_MIME_TYPES[ext].includes(mimeType)) {
    return {
      ok: false,
      errors: { file: `Tipe berkas (${mimeType}) tidak cocok dengan ekstensi .${ext}.` },
    };
  }

  if (buffer.length === 0) {
    return { ok: false, errors: { file: "Berkas kosong." } };
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      errors: { file: "Ukuran berkas melebihi 10 MB." },
    };
  }

  if (!MAGIC_BYTES[ext](buffer)) {
    return {
      ok: false,
      errors: { file: "Isi berkas tidak valid (bukan file PDF/JPG/XLSX asli)." },
    };
  }

  return { ok: true };
}

/** SHA-256 hex dari buffer — untuk integritas & deteksi duplikat. */
export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/** Bersihkan nama file: hanya karakter aman, batasi panjang, tanpa titik di awal. */
export function sanitizeFileName(fileName: string): string {
  const base = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+/, "");
  return base.length > 80 ? base.slice(-80) : base;
}
