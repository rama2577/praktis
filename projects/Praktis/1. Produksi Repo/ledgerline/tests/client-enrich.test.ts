import { describe, expect, it, vi } from "vitest";

vi.mock("@/ai/llm", () => ({
  isLLMConfigured: vi.fn(() => true),
  getLlmConfig: vi.fn(() => ({ model: "glm-4.5-air", visionModel: "glm-4.5", strongModel: "glm-4.6" })),
  chatJsonWithFallback: vi.fn(async () => ({
    json: { taxId: "01.234.567.8-901.234", industry: "SERVICES", address: "Jl. Sudirman No. 12, Jakarta", confidence: 0.92 },
    model: "glm-4.5-air",
  })),
}));

import { normalizeNpwp, parseClientEnrichment } from "@/server/client-profile";
import { chatJsonWithFallback } from "@/ai/llm";

describe("normalizeNpwp", () => {
  it("mengambil 15 digit & format standar", () => {
    expect(normalizeNpwp("01.234.567.8-901.234")).toBe("01.234.567.8-901.234");
    expect(normalizeNpwp("012345678901234")).toBe("01.234.567.8-901.234");
  });

  it("menolak panjang salah", () => {
    expect(normalizeNpwp("1234567890")).toBeNull();
    expect(normalizeNpwp(null)).toBeNull();
    expect(normalizeNpwp("")).toBeNull();
  });
});

describe("parseClientEnrichment", () => {
  it("ekstrak NPWP + industri + alamat dari LLM", async () => {
    const r = await parseClientEnrichment("Akta PT Contoh, NPWP 01.234.567.8-901.234");
    expect(r.taxId).toBe("01.234.567.8-901.234");
    expect(r.industry).toBe("SERVICES");
    expect(r.address).toContain("Sudirman");
  });

  it("mengabaikan industry yang tidak valid → null", async () => {
    vi.mocked(chatJsonWithFallback).mockResolvedValueOnce({
      json: { taxId: null, industry: "PERBANKAN_X", address: null, confidence: 0.5 },
      model: "glm-4.5-air",
    });
    const r = await parseClientEnrichment("teks");
    expect(r.industry).toBeNull();
  });

  it("NPWP tidak lengkap → taxId null", async () => {
    vi.mocked(chatJsonWithFallback).mockResolvedValueOnce({
      json: { taxId: "123", industry: "RETAIL", address: null, confidence: 0.5 },
      model: "glm-4.5-air",
    });
    const r = await parseClientEnrichment("teks");
    expect(r.taxId).toBeNull();
  });
});
