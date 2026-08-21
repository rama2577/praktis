import { describe, expect, it, afterEach } from "vitest";
import { decryptBuffer, encryptBuffer } from "@/lib/crypto";

const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);
const KEY_C = "c".repeat(64);

describe("rotasi kunci enkripsi (F-3)", () => {
  afterEach(() => {
    delete process.env.STORAGE_ENCRYPTION_KEY;
    delete process.env.STORAGE_ENCRYPTION_KEY_PREVIOUS;
  });

  it("data lama (kunci A) tetap bisa didekripsi setelah rotasi ke B", () => {
    process.env.STORAGE_ENCRYPTION_KEY = KEY_A;
    const encrypted = encryptBuffer(Buffer.from("dokumen lama"));

    process.env.STORAGE_ENCRYPTION_KEY = KEY_B;
    process.env.STORAGE_ENCRYPTION_KEY_PREVIOUS = KEY_A;
    expect(decryptBuffer(encrypted).toString()).toBe("dokumen lama");
  });

  it("enkripsi baru memakai kunci aktif (B), bukan kunci lama", () => {
    process.env.STORAGE_ENCRYPTION_KEY = KEY_B;
    process.env.STORAGE_ENCRYPTION_KEY_PREVIOUS = KEY_A;
    const encrypted = encryptBuffer(Buffer.from("dokumen baru"));

    // kunci lama dihapus → hanya B yang tersisa → tetap bisa dekripsi
    delete process.env.STORAGE_ENCRYPTION_KEY_PREVIOUS;
    expect(decryptBuffer(encrypted).toString()).toBe("dokumen baru");
  });

  it("dua kunci lama (koma) dicoba berurutan", () => {
    process.env.STORAGE_ENCRYPTION_KEY = KEY_A;
    const encryptedWithA = encryptBuffer(Buffer.from("data A"));

    process.env.STORAGE_ENCRYPTION_KEY = KEY_B;
    const encryptedWithB = encryptBuffer(Buffer.from("data B"));

    process.env.STORAGE_ENCRYPTION_KEY = KEY_C;
    process.env.STORAGE_ENCRYPTION_KEY_PREVIOUS = `${KEY_A},${KEY_B}`;
    expect(decryptBuffer(encryptedWithA).toString()).toBe("data A");
    expect(decryptBuffer(encryptedWithB).toString()).toBe("data B");
  });

  it("kunci lama tidak disertakan → data lama gagal dekripsi", () => {
    process.env.STORAGE_ENCRYPTION_KEY = KEY_A;
    const encrypted = encryptBuffer(Buffer.from("rahasia"));

    process.env.STORAGE_ENCRYPTION_KEY = KEY_B; // A hilang
    expect(() => decryptBuffer(encrypted)).toThrow();
  });
});
