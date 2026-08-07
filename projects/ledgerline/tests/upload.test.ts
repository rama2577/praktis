import { describe, expect, it } from "vitest";
import {
  validateUploadFile,
  detectUploadExtension,
  sha256Hex,
  sanitizeFileName,
  MAX_UPLOAD_BYTES,
} from "@/server/documents";

const PDF_HEADER = Buffer.from("%PDF-1.4\n...");
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const XLSX_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

describe("detectUploadExtension", () => {
  it("mengenali pdf, jpg, jpeg, xlsx", () => {
    expect(detectUploadExtension("invoice.pdf")).toBe("pdf");
    expect(detectUploadExtension("scan.JPG")).toBe("jpg");
    expect(detectUploadExtension("foto.jpeg")).toBe("jpeg");
    expect(detectUploadExtension("bank.xlsx")).toBe("xlsx");
  });

  it("menolak ekstensi lain & tanpa ekstensi", () => {
    expect(detectUploadExtension("virus.exe")).toBeNull();
    expect(detectUploadExtension("noext")).toBeNull();
    expect(detectUploadExtension("file.png")).toBeNull();
  });
});

describe("validateUploadFile", () => {
  it("menerima PDF asli", () => {
    expect(validateUploadFile("a.pdf", "application/pdf", PDF_HEADER).ok).toBe(true);
  });

  it("menerima JPG asli", () => {
    expect(validateUploadFile("a.jpg", "image/jpeg", JPEG_HEADER).ok).toBe(true);
  });

  it("menerima XLSX asli (ZIP magic bytes)", () => {
    expect(validateUploadFile("a.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", XLSX_HEADER).ok).toBe(true);
  });

  it("menolak ekstensi tidak didukung", () => {
    const r = validateUploadFile("a.exe", "application/x-msdownload", Buffer.from("MZ..."));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.file).toContain("PDF, JPG, atau XLSX");
  });

  it("menolak MIME tidak cocok dengan ekstensi", () => {
    const r = validateUploadFile("a.pdf", "text/plain", PDF_HEADER);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.file).toContain("tidak cocok");
  });

  it("menolak isi palsu (nama .pdf tapi bukan PDF)", () => {
    const r = validateUploadFile("palsu.pdf", "application/pdf", Buffer.from("Ini bukan pdf"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.file).toContain("tidak valid");
  });

  it("menolak berkas kosong", () => {
    const r = validateUploadFile("a.pdf", "application/pdf", Buffer.alloc(0));
    expect(r.ok).toBe(false);
  });

  it("menolak ukuran > 10 MB", () => {
    const big = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
    // isi header PDF agar magic bytes lolos
    big.set(Buffer.from("%PDF"), 0);
    const r = validateUploadFile("a.pdf", "application/pdf", big);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.file).toContain("10 MB");
  });
});

describe("sha256Hex & sanitizeFileName", () => {
  it("sha256 konsisten & panjang 64 hex", () => {
    const h1 = sha256Hex(Buffer.from("abc"));
    const h2 = sha256Hex(Buffer.from("abc"));
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("sanitizeFileName menghilangkan karakter berbahaya", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("etc_passwd.pdf");
    expect(sanitizeFileName("faktur pajak 2026.pdf")).toBe("faktur_pajak_2026.pdf");
  });
});
