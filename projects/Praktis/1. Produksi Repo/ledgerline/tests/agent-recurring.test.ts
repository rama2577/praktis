import { describe, expect, it } from "vitest";
import { buildHeadline } from "@/server/agent";
import { detectRecurringKind } from "@/server/recurring";

describe("buildHeadline (agent proaktif)", () => {
  it("kosong → aman", () => {
    expect(buildHeadline([])).toContain("aman");
  });
  it("gabung bagian aktif", () => {
    expect(buildHeadline(["3 dokumen baru", "1× SLA breached"])).toBe("3 dokumen baru · 1× SLA breached");
  });
});

describe("detectRecurringKind", () => {
  it("akun sewa → sewa", () => {
    expect(detectRecurringKind(["Beban Sewa Kantor", "Kas"])).toBe("sewa");
  });
  it("akun gaji/BPJS → gaji", () => {
    expect(detectRecurringKind(["Beban Gaji", "BPJS Ketenagakerjaan"])).toBe("gaji");
  });
  it("tidak ada sinyal → null", () => {
    expect(detectRecurringKind(["Penjualan", "Kas"])).toBeNull();
  });
});
