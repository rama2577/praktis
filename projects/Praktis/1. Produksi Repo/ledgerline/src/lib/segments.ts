/**
 * Ekspansi segmen (deck V9) — 5 segmen, satu mesin.
 *
 * Tiap firma punya `segment` yang menentukan modul aktif (matriks slide 10)
 * dan label peran (RBAC "satu matriks, banyak label"). Modul dinyalakan lewat
 * flag (bukan build terpisah) — segmen baru = konfigurasi.
 */
import type { Segment } from "@prisma/client";

export const SEGMENT_LABELS: Record<Segment, string> = {
  FIRMA_AKUNTAN: "Firma Akuntan",
  KONSULTAN_PAJAK: "Konsultan Pajak",
  KONSULTAN_MANAJEMEN: "Konsultan Manajemen",
  MAHASISWA_MAGANG: "Mahasiswa Magang",
  KARYAWAN_AKUNTANSI: "Karyawan Akuntansi",
};

export type ModuleKey =
  | "pipeline"
  | "review"
  | "ledger"
  | "core-tax"
  | "assets"
  | "custom-ai"
  | "knowledge"
  | "portal";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  pipeline: "Pipeline & OCR",
  review: "Review 4 lapis",
  ledger: "Buku besar & laporan",
  "core-tax": "Core Tax (SPT)",
  assets: "Aset & penyusutan",
  "custom-ai": "Laporan Custom AI",
  knowledge: "Knowledge Base",
  portal: "Portal klien",
};

/** Matriks modul per segmen — sumber: deck V9 slide 10 "Arsitektur". */
export const SEGMENT_MODULES: Record<Segment, ModuleKey[]> = {
  FIRMA_AKUNTAN: ["pipeline", "review", "ledger", "core-tax", "assets", "custom-ai", "knowledge", "portal"],
  KONSULTAN_PAJAK: ["pipeline", "review", "ledger", "core-tax", "assets", "knowledge", "portal"],
  KONSULTAN_MANAJEMEN: ["pipeline", "review", "ledger", "assets", "custom-ai", "knowledge", "portal"],
  MAHASISWA_MAGANG: ["pipeline", "review", "ledger", "core-tax", "custom-ai", "knowledge"],
  KARYAWAN_AKUNTANSI: ["pipeline", "review", "ledger", "core-tax", "assets", "custom-ai", "knowledge"],
};

export function isModuleEnabled(segment: Segment, module: ModuleKey): boolean {
  return SEGMENT_MODULES[segment].includes(module);
}

/** Label peran per segmen — "Pembimbing" (magang) = "Reviewer" (karyawan), dst. */
export const SEGMENT_ROLE_LABELS: Record<Segment, Record<string, string>> = {
  FIRMA_AKUNTAN: { ADMIN: "Admin", JUNIOR: "Junior", SENIOR: "Senior", TAX: "Tax Specialist", PARTNER: "Partner" },
  KONSULTAN_PAJAK: { ADMIN: "Admin", JUNIOR: "Asisten Pajak", SENIOR: "Konsultan Pajak", TAX: "Tax Specialist", PARTNER: "Partner Pajak" },
  KONSULTAN_MANAJEMEN: { ADMIN: "Admin", JUNIOR: "Analis", SENIOR: "Konsultan", TAX: "Analis Fiskal", PARTNER: "Principal" },
  MAHASISWA_MAGANG: { ADMIN: "Admin", JUNIOR: "Magang", SENIOR: "Pembimbing", TAX: "Reviewer Pajak", PARTNER: "Dosen Pembimbing" },
  KARYAWAN_AKUNTANSI: { ADMIN: "Admin", JUNIOR: "Staff Akuntansi", SENIOR: "Supervisor", TAX: "Staff Pajak", PARTNER: "Kepala Akuntansi" },
};
