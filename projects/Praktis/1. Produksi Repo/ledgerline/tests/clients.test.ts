import { describe, expect, it } from "vitest";
import { validateClientInput } from "@/server/clients";

describe("validateClientInput", () => {
  it("menerima input valid", () => {
    const r = validateClientInput({ name: "PT Maju Jaya", industry: "RETAIL", taxId: "01.234.567.8-901.000" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.name).toBe("PT Maju Jaya");
      expect(r.data.taxId).toBe("01.234.567.8-901.000");
    }
  });

  it("menolak nama kosong", () => {
    const r = validateClientInput({ name: "   ", industry: "RETAIL" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toBeTruthy();
  });

  it("menolak industri di luar enum", () => {
    const r = validateClientInput({ name: "PT X", industry: "MINING" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.industry).toBeTruthy();
  });

  it("menolak NPWP dengan karakter ilegal", () => {
    const r = validateClientInput({ name: "PT X", industry: "FNB", taxId: "abc!@#" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.taxId).toBeTruthy();
  });

  it("menganggap NPWP kosong sebagai opsional (null)", () => {
    const r = validateClientInput({ name: "CV Berkah", industry: "SERVICES", taxId: "   " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.taxId).toBeNull();
  });

  it("memotong spasi di nama", () => {
    const r = validateClientInput({ name: "  PT Sentosa  ", industry: "FNB" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.name).toBe("PT Sentosa");
  });
});
