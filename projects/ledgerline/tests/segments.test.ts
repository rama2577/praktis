import { describe, expect, it } from "vitest";
import { isModuleEnabled, SEGMENT_LABELS, SEGMENT_MODULES } from "@/lib/segments";

describe("segments — matriks modul (deck V9 slide 10)", () => {
  it("Firma Akuntan = semua 8 modul aktif", () => {
    expect(SEGMENT_MODULES.FIRMA_AKUNTAN).toHaveLength(8);
    expect(isModuleEnabled("FIRMA_AKUNTAN", "core-tax")).toBe(true);
    expect(isModuleEnabled("FIRMA_AKUNTAN", "portal")).toBe(true);
  });

  it("Konsultan Pajak: ada Core Tax, tanpa Laporan Custom AI", () => {
    expect(isModuleEnabled("KONSULTAN_PAJAK", "core-tax")).toBe(true);
    expect(isModuleEnabled("KONSULTAN_PAJAK", "custom-ai")).toBe(false);
    expect(isModuleEnabled("KONSULTAN_PAJAK", "portal")).toBe(true);
  });

  it("Konsultan Manajemen: ada Custom AI, tanpa Core Tax", () => {
    expect(isModuleEnabled("KONSULTAN_MANAJEMEN", "custom-ai")).toBe(true);
    expect(isModuleEnabled("KONSULTAN_MANAJEMEN", "core-tax")).toBe(false);
    expect(isModuleEnabled("KONSULTAN_MANAJEMEN", "assets")).toBe(true);
  });

  it("Mahasiswa Magang: tanpa Aset & Portal, dengan Custom AI", () => {
    expect(isModuleEnabled("MAHASISWA_MAGANG", "assets")).toBe(false);
    expect(isModuleEnabled("MAHASISWA_MAGANG", "portal")).toBe(false);
    expect(isModuleEnabled("MAHASISWA_MAGANG", "custom-ai")).toBe(true);
    expect(isModuleEnabled("MAHASISWA_MAGANG", "core-tax")).toBe(true);
  });

  it("Karyawan Akuntansi: tanpa Portal, dengan Aset", () => {
    expect(isModuleEnabled("KARYAWAN_AKUNTANSI", "portal")).toBe(false);
    expect(isModuleEnabled("KARYAWAN_AKUNTANSI", "assets")).toBe(true);
    expect(isModuleEnabled("KARYAWAN_AKUNTANSI", "custom-ai")).toBe(true);
  });

  it("label tersedia untuk 5 segmen", () => {
    expect(Object.keys(SEGMENT_LABELS)).toHaveLength(5);
    expect(SEGMENT_LABELS.MAHASISWA_MAGANG).toBe("Mahasiswa Magang");
  });
});
