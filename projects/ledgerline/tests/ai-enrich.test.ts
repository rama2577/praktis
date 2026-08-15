import { describe, expect, it, vi, beforeEach } from "vitest";

const DEFAULT_JSON = [
  { id: "a", description: "Pembayaran faktur PT Mitra Niaga", confidence: 0.95 },
  { id: "b", description: "Penjualan tunai harian", confidence: 0.9 },
];

vi.mock("@/ai/llm", () => ({
  isLLMConfigured: vi.fn(() => true),
  chatJsonWithFallback: vi.fn(async () => ({ json: [], model: "glm-4.5-air" })),
}));

import { enrichJournalLines, ruleDescription, describeJournal, fallbackDescribe } from "@/server/ai-enrich";
import { isLLMConfigured, chatJsonWithFallback } from "@/ai/llm";

beforeEach(() => {
  vi.mocked(isLLMConfigured).mockReset();
  vi.mocked(isLLMConfigured).mockReturnValue(true);
  vi.mocked(chatJsonWithFallback).mockReset();
  vi.mocked(chatJsonWithFallback).mockResolvedValue({ json: DEFAULT_JSON, model: "glm-4.5-air" });
});

const LINES = [
  { id: "a", accountCode: "1-1100", accountName: "Kas", debit: 27_750_000, credit: 0, notes: "Faktur FP-010" },
  { id: "b", accountCode: "4-1000", accountName: "Penjualan", debit: 0, credit: 5_000_000, notes: null },
];

describe("ruleDescription (fallback deterministik)", () => {
  it("merangkai akun + jumlah + keterangan", () => {
    const d = ruleDescription({ id: "x", accountCode: "1-1100", accountName: "Kas", debit: 1_500_000, credit: 0, notes: "Nota 001" });
    expect(d).toContain("Kas (1-1100)");
    expect(d).toContain("Debit");
    expect(d).toContain("Nota 001");
  });
});

describe("enrichJournalLines (batch AI)", () => {
  it("memetakan deskripsi AI per id", async () => {
    const res = await enrichJournalLines(LINES);
    expect(res).toHaveLength(2);
    expect(res[0]).toMatchObject({ id: "a", source: "AI", confidence: 0.95 });
    expect(res[0].description).toBe("Pembayaran faktur PT Mitra Niaga");
  });

  it("fallback RULE untuk id yang tidak dikembalikan LLM", async () => {
    vi.mocked(chatJsonWithFallback).mockResolvedValueOnce({ json: [], model: "glm-4.5-air" });
    const res = await enrichJournalLines(LINES);
    expect(res.every((r) => r.source === "RULE")).toBe(true);
  });

  it("fallback RULE saat LLM tidak dikonfigurasi", async () => {
    vi.mocked(isLLMConfigured).mockReturnValueOnce(false);
    const res = await enrichJournalLines(LINES);
    expect(res.every((r) => r.source === "RULE")).toBe(true);
    expect(chatJsonWithFallback).not.toHaveBeenCalled();
  });

  it("fallback RULE saat LLM melempar error", async () => {
    vi.mocked(chatJsonWithFallback).mockRejectedValueOnce(new Error("boom"));
    const res = await enrichJournalLines(LINES);
    expect(res.every((r) => r.source === "RULE")).toBe(true);
  });

  it("array kosong → hasil kosong", async () => {
    expect(await enrichJournalLines([])).toEqual([]);
  });
});

describe("describeJournal (deskripsi entry)", () => {
  const lines = [
    { accountName: "Kas", debit: 27_750_000, credit: 0 },
    { accountName: "Penjualan", debit: 0, credit: 27_750_000 },
  ];

  it("memakai deskripsi AI dari LLM", async () => {
    vi.mocked(chatJsonWithFallback).mockResolvedValueOnce({ json: { description: "Penjualan tunai" }, model: "glm-4.5-air" });
    const r = await describeJournal(lines);
    expect(r).toEqual({ description: "Penjualan tunai", source: "AI" });
  });

  it("fallback deterministik saat LLM off", async () => {
    vi.mocked(isLLMConfigured).mockReturnValueOnce(false);
    const r = await describeJournal(lines);
    expect(r.source).toBe("RULE");
    expect(r.description).toContain("Kas");
  });

  it("fallback saat LLM melempar error", async () => {
    vi.mocked(chatJsonWithFallback).mockRejectedValueOnce(new Error("boom"));
    const r = await describeJournal(lines);
    expect(r.source).toBe("RULE");
  });
});

describe("fallbackDescribe", () => {
  it("merangkai akun + nominal", () => {
    const d = fallbackDescribe([{ accountName: "Kas", debit: 1000, credit: 0 }]);
    expect(d).toContain("Kas");
    expect(d).toContain("1000");
  });

  it("tanpa nominal → jurnal umum", () => {
    expect(fallbackDescribe([])).toBe("Jurnal umum");
  });
});
