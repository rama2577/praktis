import { describe, expect, it } from "vitest";
import { parseEfakturQr, qrToText } from "@/ai/qr";

const SAMPLE = "NPWP: 01.234.567.8-901.234 | No. Faktur: 010.000-22.98765432 | DPP: 25.000.000 | PPN: 2.750.000";

describe("parseEfakturQr", () => {
  it("ekstrak NPWP + nomor faktur + DPP + PPN", () => {
    const qr = parseEfakturQr(SAMPLE);
    expect(qr.npwp).toBe("01.234.567.8-901.234");
    expect(qr.invoiceNumber).toBe("010.000-22.98765432");
    expect(qr.totalDpp).toBe("25.000.000");
    expect(qr.totalPpn).toBe("2.750.000");
  });

  it("tanpa NPWP valid → null", () => {
    const qr = parseEfakturQr("No. Faktur: 010.000-22.98765432");
    expect(qr.npwp).toBeNull();
    expect(qr.invoiceNumber).toBe("010.000-22.98765432");
  });
});

describe("qrToText", () => {
  it("merangkai field terstruktur", () => {
    const t = qrToText(parseEfakturQr(SAMPLE));
    expect(t).toContain("NPWP: 01.234.567.8-901.234");
    expect(t).toContain("No. Faktur: 010.000-22.98765432");
  });
});
