import { describe, expect, it, vi } from "vitest";

vi.mock("@/ai/llm", () => ({
  isLLMConfigured: vi.fn(() => true),
  getLlmConfig: vi.fn(() => ({ model: "glm-4.5-air", visionModel: "glm-4.5", strongModel: "glm-4.6" })),
  chatCompletion: vi.fn(async () => "Saldo kas PT X akhir bulan lalu adalah Rp 120.000.000."),
}));

vi.mock("@/server/brief", () => ({
  getDailyBrief: vi.fn(async () => ({ summary: "Hari ini: 3 dokumen baru.", items: [], priorityQueue: [], anomalies: [], generatedAt: "" })),
}));
vi.mock("@/server/dashboard", () => ({
  getDashboardData: vi.fn(async () => ({ activeClients: 5, transactionsToday: 120, aiDraftJobs: 40, reviewJobs: 12, slaBreachCount: 1 })),
}));

import { classifyIntent, answerCommand } from "@/server/ai-command";

describe("classifyIntent", () => {
  it("deteksi ask (data)", () => {
    expect(classifyIntent("Berapa saldo kas PT X?")).toBe("ask");
    expect(classifyIntent("Total klien aktif")).toBe("ask");
  });
  it("deteksi draft", () => {
    expect(classifyIntent("Buat jurnal penyesuaian penyusutan")).toBe("draft");
  });
  it("deteksi explain", () => {
    expect(classifyIntent("Jelaskan PSAK 71")).toBe("explain");
    expect(classifyIntent("Apa itu rekonsiliasi bank?")).toBe("explain");
  });
  it("default → help", () => {
    expect(classifyIntent("halo")).toBe("help");
  });
});

describe("answerCommand", () => {
  it("ask → jawaban AI dengan konteks firma", async () => {
    const r = await answerCommand("Berapa saldo kas?", "firm-1");
    expect(r.intent).toBe("ask");
    expect(r.answer).toContain("120.000.000");
  });
});
