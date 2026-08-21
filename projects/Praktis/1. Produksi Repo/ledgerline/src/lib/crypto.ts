import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Enkripsi at-rest untuk dokumen klien (AES-256-GCM) — mendukung ROTASI KUNCI.
 *
 * Kunci: `STORAGE_ENCRYPTION_KEY` (aktif, hex 64) + `STORAGE_ENCRYPTION_KEY_PREVIOUS`
 * (kunci lama, dipisah koma) untuk mendekripsi data yang belum di-re-encrypt.
 * Enkripsi selalu memakai kunci aktif; dekripsi mencoba kunci aktif dulu, lalu
 * kunci lama (auth tag GCM membedakan mana yang cocok).
 *
 * Fallback DEV: hash deterministik — TIDAK aman untuk produksi, hanya agar app
 * tetap jalan tanpa konfigurasi. Warning dicetak sekali.
 */
function parseKeyHex(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const hex = raw.replace(/^0x/, "");
  return /^[0-9a-fA-F]{64}$/.test(hex) ? Buffer.from(hex, "hex") : null;
}

let warnedDevKey = false;
function resolveKeys(): Buffer[] {
  const keys: Buffer[] = [];
  const active = parseKeyHex(process.env.STORAGE_ENCRYPTION_KEY);
  if (active) keys.push(active);
  const prev = process.env.STORAGE_ENCRYPTION_KEY_PREVIOUS;
  if (prev) {
    for (const part of prev.split(",")) {
      const k = parseKeyHex(part.trim());
      if (k) keys.push(k);
    }
  }
  if (keys.length === 0) {
    if (!warnedDevKey) {
      warnedDevKey = true;
      console.warn(
        "[crypto] STORAGE_ENCRYPTION_KEY tidak diset — memakai kunci DEV (tidak aman untuk produksi).",
      );
    }
    keys.push(createHash("sha256").update("ledgerline-dev-fallback").digest());
  }
  return keys;
}

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/** Enkripsi buffer → [iv(12)][authTag(16)][ciphertext] dengan kunci AKTIF. */
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, resolveKeys()[0], iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

/** Dekripsi buffer hasil `encryptBuffer`. Mencoba kunci aktif lalu kunci lama
 *  (rotasi). Lempar error jika tidak ada kunci cocok / data rusak. */
export function decryptBuffer(payload: Buffer): Buffer {
  if (payload.length < IV_LEN + TAG_LEN) throw new Error("Payload terenkripsi tidak valid");
  const iv = payload.subarray(0, IV_LEN);
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = payload.subarray(IV_LEN + TAG_LEN);
  for (const k of resolveKeys()) {
    try {
      const decipher = createDecipheriv(ALGO, k, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]);
    } catch {
      // auth gagal dengan kunci ini → coba kunci berikutnya (rotasi kunci)
    }
  }
  throw new Error("Gagal dekripsi: kunci tidak cocok / data rusak");
}
