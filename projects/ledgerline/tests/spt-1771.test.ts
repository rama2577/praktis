import { describe, expect, it } from "vitest";
import { tarifPphBadan, hitungPphBadan, rekonsiliasiCsv, pphCsv } from "@/server/spt-1771";

describe("SPT 1771 — tarif & perhitungan PPh", () => {
  it("tarif UU HPP: 22% (2020–2022), 20% (2023+)", () => {
    expect(tarifPphBadan(2019)).toBe(0.25);
    expect(tarifPphBadan(2020)).toBe(0.22);
    expect(tarifPphBadan(2022)).toBe(0.22);
    expect(tarifPphBadan(2023)).toBe(0.2);
    expect(tarifPphBadan(2026)).toBe(0.2);
  });

  it("Pasal 31E: PKP ≤ 4,8M → 50% × tarif × PKP", () => {
    const { pph, tarif } = hitungPphBadan(100_000_000, 3_000_000_000, 2026, "31e");
    expect(tarif).toBe(0.1); // 50% × 20%
    expect(pph).toBe(10_000_000);
  });

  it("Pasal 31E proporsional: 4,8–50M", () => {
    const { pph } = hitungPphBadan(500_000_000, 10_000_000_000, 2026, "31e");
    // rasio = 4.8/10 = 0.48 → tarif efektif = 0.2 × (0.5×0.48 + 0.52) = 0.2 × 0.76 = 0.152
    expect(pph).toBeCloseTo(500_000_000 * 0.152, 0);
  });

  it("tanpa fasilitas: tarif × PKP", () => {
    const { pph, tarif } = hitungPphBadan(1_000_000_000, 60_000_000_000, 2026, "normal");
    expect(tarif).toBe(0.2);
    expect(pph).toBe(200_000_000);
  });

  it("PP 23: 0,5% × peredaran bruto", () => {
    const { pph, tarif } = hitungPphBadan(100_000_000, 2_000_000_000, 2026, "pp23");
    expect(tarif).toBe(0.005);
    expect(pph).toBe(10_000_000);
  });

  it("rugi fiskal → PPh 0", () => {
    const { pph } = hitungPphBadan(-50_000_000, 1_000_000_000, 2026, "normal");
    expect(pph).toBe(0);
  });
});

describe("SPT 1771 — export CSV", () => {
  it("rekonsiliasiCsv: header + total laba fiskal", () => {
    const csv = rekonsiliasiCsv({
      clientName: "PT Contoh",
      year: 2026,
      pendapatan: [{ kode: "4-101-001", nama: "Pendapatan Usaha", komersial: 10_000_000, koreksiPositif: 0, koreksiNegatif: 0, fiskal: 10_000_000 }],
      beban: [{ kode: "5-101-001", nama: "Beban PPh", komersial: 2_000_000, koreksiPositif: 2_000_000, koreksiNegatif: 0, fiskal: 0 }],
      labaKomersial: 8_000_000,
      totalKoreksiPositif: 2_000_000,
      totalKoreksiNegatif: 0,
      labaFiskal: 10_000_000,
    });
    expect(csv.startsWith("\uFEFFLAMPIRAN I")).toBe(true);
    expect(csv).toContain("Laba Fiskal;;;;;10000000");
    expect(csv).toContain("Beban PPh");
  });

  it("pphCsv: berisi pos kunci", () => {
    const csv = pphCsv({
      clientName: "PT Contoh",
      year: 2026,
      labaFiskal: 100_000_000,
      pkp: 100_000_000,
      tarifPph: 0.2,
      peredaranBruto: 1_000_000_000,
      mode: "31e",
      pphTerutang: 10_000_000,
      kreditPajak: 4_000_000,
      pphKurangBayar: 6_000_000,
      catatan: ["Pasal 31E"],
    });
    expect(csv).toContain("PPh Kurang/(Lebih) Bayar;6");
    expect(csv).toContain("Tarif;20%");
  });
});
