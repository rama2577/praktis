import { describe, expect, it } from "vitest";
import { decryptBuffer, encryptBuffer } from "@/lib/crypto";
import { isRateLimited, MAX_UPLOADS_PER_MINUTE, rateLimitKey } from "@/lib/rate-limit";

describe("enkripsi at-rest (AES-256-GCM)", () => {
  it("roundtrip: dekripsi(enkripsi(data)) === data", () => {
    const plain = Buffer.from("Faktur PPN 010.000-22.12345678 — Rp 8.500.000");
    const encrypted = encryptBuffer(plain);
    expect(encrypted.equals(plain)).toBe(false); // pasti berubah
    expect(decryptBuffer(encrypted).toString()).toBe(plain.toString());
  });

  it("setiap enkripsi menghasilkan output berbeda (random IV)", () => {
    const plain = Buffer.from("data yang sama");
    expect(encryptBuffer(plain).equals(encryptBuffer(plain))).toBe(false);
  });

  it("payload rusak / pendek → error, bukan hasil salah", () => {
    expect(() => decryptBuffer(Buffer.from("pendek"))).toThrow();
    const encrypted = encryptBuffer(Buffer.from("data"));
    encrypted[encrypted.length - 1] ^= 0xff; // korup 1 byte
    expect(() => decryptBuffer(encrypted)).toThrow();
  });
});

describe("rate limit", () => {
  it("isRateLimited: di bawah/tepat batas tidak dibatasi; lebih dari batas dibatasi", () => {
    expect(isRateLimited(10, 10)).toBe(false);
    expect(isRateLimited(11, 10)).toBe(true);
    expect(isRateLimited(0, 10)).toBe(false);
  });

  it("MAX_UPLOADS_PER_MINUTE = 10; kunci Redis ber-scope", () => {
    expect(MAX_UPLOADS_PER_MINUTE).toBe(10);
    expect(rateLimitKey("upload", "user-1")).toBe("rl:upload:user-1");
  });
});
