import { describe, expect, it } from "vitest";
import { buildEBupotXml, buildEfakturXml, normalizeNpwp, objectCodeOf, type TaxLineForXml } from "@/server/tax-xml";

const line = (over: Partial<TaxLineForXml>): TaxLineForXml => ({
  id: "l1",
  entryDate: "2026-08-11T00:00:00.000Z",
  description: "Penjualan kredit #INV-012 — PT Maju Jaya",
  taxCode: "PPN-OUT-01",
  taxBase: 2_035_000,
  amount: 223_850,
  ...over,
});

describe("tax-xml — util (F5B lanjutan)", () => {
  it("normalize NPWP → 16 digit", () => {
    expect(normalizeNpwp("01.234.567.8-901.000")).toBe("0123456789010000");
    expect(normalizeNpwp(null)).toBe("");
  });
  it("kode objek pajak dari taxCode", () => {
    expect(objectCodeOf("PPH23-104")).toBe("104");
    expect(objectCodeOf("PPH42-403")).toBe("403");
    expect(objectCodeOf("PPN-OUT-01")).toBe("");
  });
});

describe("tax-xml — e-Faktur", () => {
  it("menghasilkan XML dengan NPWP, DPP, PPN", () => {
    const xml = buildEfakturXml(
      [line({}), line({ id: "l2", taxBase: 1_000_000, amount: 110_000, description: "Penjualan #2" })],
      { npwp: "01.234.567.8-901.000", nama: "PT Maju Jaya", period: "2026-08", clientName: "PT Maju Jaya" },
    );
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<eFaktur");
    expect(xml).toContain("<NPWP>0123456789010000</NPWP>");
    expect(xml).toContain("<JumlahDpp>2035000.00</JumlahDpp>");
    expect(xml).toContain("<JumlahPpn>223850.00</JumlahPpn>");
    expect(xml).toContain('<NoFaktur>010000000000001</NoFaktur>');
    expect(xml).toContain('<NoFaktur>010000000000002</NoFaktur>');
    expect(xml).toContain('<TglFaktur>2026-08-11</TglFaktur>');
  });

  it("baris non-PPN-OUT tidak masuk e-Faktur", () => {
    const xml = buildEfakturXml([line({ taxCode: "PPH23-104" })], {
      npwp: "01.234.567.8-901.000",
      nama: "X",
      period: "2026-08",
      clientName: "X",
    });
    expect(xml).not.toContain("<Faktur>");
  });

  it("escape karakter XML pada deskripsi", () => {
    const xml = buildEfakturXml([line({ description: "Penjualan <#A> & \"B\"" })], {
      npwp: "01.234.567.8-901.000",
      nama: "PT Maju Jaya",
      period: "2026-08",
      clientName: "PT Maju Jaya",
    });
    expect(xml).toContain("Penjualan &lt;#A&gt; &amp; &quot;B&quot;");
    expect(xml).not.toContain("<#A>");
  });
});

describe("tax-xml — e-Bupot", () => {
  it("menghasilkan bukti potong PPh 23 dengan kode objek pajak", () => {
    const xml = buildEBupotXml(
      [line({ taxCode: "PPH23-104", taxBase: 10_000_000, amount: 200_000, description: "Jasa teknik" })],
      { npwp: "01.234.567.8-901.000", nama: "PT Maju Jaya", period: "2026-08", clientName: "PT Maju Jaya" },
    );
    expect(xml).toContain("<eBupot");
    expect(xml).toContain("<kodeObjekPajak>104</kodeObjekPajak>");
    expect(xml).toContain("<masa>08</masa>");
    expect(xml).toContain("<tahun>2026</tahun>");
    expect(xml).toContain("<jumlahPenghasilanBruto>10000000.00</jumlahPenghasilanBruto>");
    expect(xml).toContain("<tarif>2</tarif>");
    expect(xml).toContain("<pphYangDipotong>200000.00</pphYangDipotong>");
  });

  it("PPh 4(2) sewa pakai tarif 10% & kode 401", () => {
    const xml = buildEBupotXml(
      [line({ taxCode: "PPH42-401", taxBase: 5_000_000, amount: 500_000 })],
      { npwp: "01.234.567.8-901.000", nama: "X", period: "2026-08", clientName: "X" },
    );
    expect(xml).toContain("<kodeObjekPajak>401</kodeObjekPajak>");
    expect(xml).toContain("<tarif>10</tarif>");
    expect(xml).toContain("<pphYangDipotong>500000.00</pphYangDipotong>");
  });

  it("baris PPN tidak masuk e-Bupot", () => {
    const xml = buildEBupotXml([line({ taxCode: "PPN-OUT-01" })], {
      npwp: "01.234.567.8-901.000",
      nama: "X",
      period: "2026-08",
      clientName: "X",
    });
    expect(xml).not.toContain("<BuktiPotong>");
  });
});
