import { describe, expect, it } from "vitest";
import {
  buildCustomReport,
  customReportCsv,
  detectReportKind,
  parseReportPrompt,
  suggestReportStructure,
  type JournalLineForReport,
} from "@/server/custom-report";

const line = (over: Partial<JournalLineForReport>): JournalLineForReport => ({
  accountCode: "4-1000",
  accountName: "Pendapatan Penjualan",
  debit: 0,
  credit: 10_000_000,
  dimension: null,
  entryDate: "2026-08-10T00:00:00.000Z",
  status: "APPROVED",
  ...over,
});

describe("custom-report — deteksi prompt (F6B)", () => {
  it("deteksi laba rugi", () => {
    expect(detectReportKind("laporan laba rugi bulan ini")).toBe("LABA_RUGI");
  });
  it("deteksi pendapatan per proyek", () => {
    expect(detectReportKind("penjualan per proyek")).toBe("PENDAPATAN_PER_PROYEK");
  });
  it("deteksi beban per channel", () => {
    expect(detectReportKind("beban per channel online")).toBe("BEBAN_PER_CHANNEL");
  });
  it("parse dimensi proyek dari prompt", () => {
    const p = parseReportPrompt("penjualan per proyek \"Proyek A\"");
    expect(p.groupBy).toBe("project");
    expect(p.dimension.project).toBe("Proyek A");
  });
  it("usulan struktur berisi kolom & confidence", () => {
    const s = suggestReportStructure("laba rugi", "2026-08");
    expect(s.kind).toBe("LABA_RUGI");
    expect(s.columns).toContain("Akun");
    expect(s.confidence).toBeGreaterThan(0.8);
    expect(s.reasons.length).toBeGreaterThan(0);
  });
});

describe("custom-report — bangun laporan", () => {
  const lines: JournalLineForReport[] = [
    line({ accountCode: "4-1000", credit: 12_000_000, dimension: { project: "Proyek A" } }),
    line({ accountCode: "4-1000", credit: 8_000_000, dimension: { project: "Proyek B" } }),
    line({ accountCode: "4-1000", credit: 5_000_000, dimension: { project: "Proyek A" }, status: "DRAFT" }),
    line({ accountCode: "5-1100", accountName: "Beban ATK", credit: 0, debit: 3_000_000, dimension: { project: "Proyek A" } }),
  ];

  it("pendapatan per proyek (groupBy project), DRAFT tidak dihitung", () => {
    const r = buildCustomReport(lines, "PENDAPATAN_PER_PROYEK", undefined, "project");
    expect(r.filteredLines).toBe(3);
    expect(r.rows.find((x) => x.label === "Proyek A")?.amount).toBe(12_000_000);
    expect(r.rows.find((x) => x.label === "Proyek B")?.amount).toBe(8_000_000);
    expect(r.total).toBe(20_000_000);
  });

  it("filter dimensi proyek A", () => {
    const r = buildCustomReport(lines, "PENDAPATAN_PER_PROYEK", { project: "Proyek A" }, "project");
    expect(r.rows.find((x) => x.label === "Proyek A")?.amount).toBe(12_000_000);
    expect(r.rows.find((x) => x.label === "Proyek B")).toBeUndefined();
  });

  it("laba rugi menjumlahkan pendapatan & beban", () => {
    const r = buildCustomReport(lines, "LABA_RUGI");
    expect(r.rows.at(-1)?.label).toBe("LABA (RUGI)");
    expect(r.total).toBe(17_000_000);
  });

  it("CSV memuat nama template & baris", () => {
    const csv = customReportCsv(
      {
        id: "t1",
        name: "Pendapatan per Proyek 2026-08",
        kind: "PENDAPATAN_PER_PROYEK",
        dimensions: {},
        period: "2026-08",
        createdAt: "",
      },
      [{ label: "Proyek A", amount: 12_000_000 }],
      "2026-08",
      "PT Maju Jaya",
    );
    expect(csv).toContain("PT Maju Jaya");
    expect(csv).toContain("Proyek A");
  });
});
