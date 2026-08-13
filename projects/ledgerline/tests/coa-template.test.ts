import { describe, expect, it } from "vitest";
import { parseCoaCsv, loadCoaTemplate, coaMappingFromTemplate } from "@/server/coa-template";
import { INDUSTRY_LIST } from "@/lib/industries";

describe("template COA per industri (Gap #2)", () => {
  it("parse CSV: header + baris akun", () => {
    const rows = parseCoaCsv("kode,nama,tipe,nature,sub_nature,laporan,psak_ref,keterangan\n1000,KAS,Aset,Lancar,Kas,Neraca,PSAK 1,\n");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kode).toBe("1000");
    expect(rows[0]!.nama).toBe("KAS");
    expect(rows[0]!.laporan).toBe("Neraca");
  });

  it("semua industri punya template COA (file ada & valid)", async () => {
    for (const ind of INDUSTRY_LIST) {
      const rows = await loadCoaTemplate(ind);
      expect(rows.length, `template ${ind} kosong`).toBeGreaterThan(30);
      expect(rows.length, `template ${ind} terlalu banyak`).toBeLessThan(200);
      // kode unik
      const codes = new Set(rows.map((r) => r.kode));
      expect(codes.size, `template ${ind} punya kode duplikat`).toBe(rows.length);
    }
  }, 30_000);

  it("template industri memiliki akun khas industri", async () => {
    const mfg = await loadCoaTemplate("MANUFACTURING");
    expect(mfg.some((r) => r.nama.includes("WIP"))).toBe(true);
    expect(mfg.some((r) => r.nama.includes("Overhead"))).toBe(true);

    const constr = await loadCoaTemplate("CONSTRUCTION");
    expect(constr.some((r) => r.nama.includes("Termin"))).toBe(true);
    expect(constr.some((r) => r.nama.includes("Contract Liability"))).toBe(true);

    const coop = await loadCoaTemplate("COOPERATIVE");
    expect(coop.some((r) => r.nama.includes("Simpanan Pokok"))).toBe(true);
    expect(coop.some((r) => r.nama.includes("SHU"))).toBe(true);

    const fin = await loadCoaTemplate("FINANCE");
    expect(fin.some((r) => r.nama.includes("Escrow"))).toBe(true);
    expect(fin.some((r) => r.nama.includes("CKPN"))).toBe(true);

    const event = await loadCoaTemplate("EVENT");
    expect(event.some((r) => r.nama.includes("Venue") || r.nama.includes("Sponsorship"))).toBe(true);

    const agri = await loadCoaTemplate("AGRICULTURE");
    expect(agri.some((r) => r.nama.includes("Aset Biologis"))).toBe(true);
  }, 30_000);

  it("coaMappingFromTemplate: format coaMapping klien + posLaporan", async () => {
    const map = await coaMappingFromTemplate("RETAIL");
    expect(Object.keys(map).length).toBeGreaterThan(30);
    const kas = map["1000"];
    expect(kas?.accountCode).toBe("1000");
    expect(kas?.posLaporan).toBe("NRC");
    const pend = map["6100"]; // template retail: 6000 PENDAPATAN / 6100 Pendapatan Penjualan
    expect(pend?.posLaporan).toBe("LR");
  }, 30_000);
});
