import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Enkripsi at-rest untuk dokumen klien (AES-256-GCM).
 * Key 32 byte dari env `STORAGE_ENCRYPTION_KEY` (hex 64 karakter).
 * Fallback DEV: hash deterministik — TIDAK aman untuk produksi, hanya agar
 * aplikasi tetap jalan tanpa konfigurasi. Warning dicetak sekali.
 */
function resolveKey(): Buffer {
  const raw = process.env.STORAGE_ENCRYPTION_KEY;
  if (raw) {
    const hex = raw.replace(/^0x/, "");
    if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  }
  if (!process.env.STORAGE_ENCRYPTION_KEY) {
    console.warn(
      "[crypto] STORAGE_ENCRYPTION_KEY tidak diset — memakai kunci DEV (tidak aman untuk produksi).",
    );
  }
  return createHash("sha256").update("ledgerline-dev-fallback").digest();
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = resolveKey();
  return cachedKey;
}

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/** Enkripsi buffer → [iv(12)][authTag(16)][ciphertext]. */
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

/** Dekripsi buffer hasil `encryptBuffer`. Lempar error jika key salah / rusak. */
export function decryptBuffer(payload: Buffer): Buffer {
  if (payload.length < IV_LEN + TAG_LEN) throw new Error("Payload terenkripsi tidak valid");
  const iv = payload.subarray(0, IV_LEN);
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = payload.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
