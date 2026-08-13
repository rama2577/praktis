import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseWorksheet, buildOpeningJournals } from "@/server/worksheet-import";

const XLSX = "/Users/staff/.openclaw-autoclaw/workspace/.openclaw-attachments/20260813-114101-43ed01f9-c4f-ASC_2026.xlsx";

describe("worksheet-import (kertas kerja akuntan)", () => {
  it("parse ASC_2026.xlsx: COA, jurnal balance, klien & tahun terdeteksi", async () => {
    const res = await parseWorksheet(readFileSync(XLSX));
    expect(res.clientName).toContain("ARYA USAHA TIRTA");
    expect(res.year).toBe(2026);
    expect(res.coa.length).toBeGreaterThanOrEqual(185);
    expect(res.stats.journalLines).toBeGreaterThan(80); // 93 baris jurnal sejati (sisanya footer export)
    expect(res.stats.journalGroups).toBeGreaterThanOrEqual(10); // 6 per-bukti + 7 agregat bulanan
    expect(res.stats.unbalancedGroups).toBe(0); // semua ter-agregasi balance
    // total D == total K (kertas kerja balance)
    expect(res.stats.totalDebit).toBeCloseTo(res.stats.totalCredit, 0);
    expect(res.subledgerCodes.length).toBeGreaterThan(5);
    const codes = new Set(res.coa.map((c) => c.code.charAt(0)));
    for (const g of ["1", "2", "3", "4", "5"]) expect(codes.has(g)).toBe(true);
  }, 60_000);

  it("COA: format kode X-XXX-XXX & pos laporan NRC/LR terisi", async () => {
    const res = await parseWorksheet(readFileSync(XLSX));
    const kas = res.coa.find((c) => c.code === "1-101-001");
    expect(kas?.name).toContain("Petty Cash");
    expect(kas?.posSaldo).toBe("Db");
    expect(res.coa.filter((c) => c.posLaporan === "NRC").length).toBeGreaterThan(50);
    expect(res.coa.filter((c) => c.posLaporan === "LR").length).toBeGreaterThan(50);
  }, 60_000);

  it("saldo awal: terdeteksi & normal balance benar (aset D, kewajiban K)", async () => {
    const res = await parseWorksheet(readFileSync(XLSX));
    expect(res.stats.openingBalanceAccounts).toBeGreaterThan(0);
    const cimb = res.coa.find((c) => c.code === "1-101-010");
    expect(cimb?.openingDebit).toBe(3_043_241); // aset → Debet
    expect(cimb?.openingCredit).toBe(0);
    const accDep = res.coa.find((c) => c.code === "1-120-105");
    expect(accDep?.openingCredit).toBe(476_032); // akumulasi (negatif di export) → Kredit
    const re = res.coa.find((c) => c.code === "3-102-001");
    expect(re?.openingCredit).toBe(4_315_514); // ekuitas → Kredit
  }, 60_000);

  it("jurnal: invoice + penagihan bulanan terkelompok & balance", async () => {
    const res = await parseWorksheet(readFileSync(XLSX));
    // total seluruh jurnal = kertas kerja balance per bulan
    const totalD = res.journals.reduce((s, j) => s + j.totalDebit, 0);
    const totalK = res.journals.reduce((s, j) => s + j.totalCredit, 0);
    expect(totalD).toBeCloseTo(totalK, 0);
    expect(totalD).toBeGreaterThan(200_000_000); // ~310 juta
    // jurnal agregat bulanan ada (untuk transaksi tidak balance per bukti)
    expect(res.journals.some((j) => j.keterangan.startsWith("Agregat"))).toBe(true);
  }, 60_000);

  it("buildOpeningJournals: 1 jurnal per akun bersaldo, tanggal 1 Jan tahun buku", () => {
    const coa = [
      { code: "1-101-010", name: "CIMB Niaga", posSaldo: "Db" as const, posLaporan: "NRC", openingDebit: 3_043_241, openingCredit: 0 },
      { code: "4-101-001", name: "Pendapatan Usaha", posSaldo: "Cr" as const, posLaporan: "LR", openingDebit: 0, openingCredit: 0 },
    ];
    const j = buildOpeningJournals(coa, 2026);
    expect(j).toHaveLength(1);
    expect(j[0]!.date).toBe("2026-01-01");
    expect(j[0]!.bukti).toBe("OPENING");
    expect(j[0]!.lines[0]!.debit).toBe(3_043_241);
  });
});
