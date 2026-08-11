import { afterEach, describe, expect, it, vi } from "vitest";
import { EVENT_RULE_LABELS } from "@/ai/rule-engine";
import {
  chatCompletion,
  chatJsonWithFallback,
  getLlmConfig,
  isLLMConfigured,
  stripCodeFence,
  visionCompletion,
} from "@/ai/llm";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockFetchOk(content: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] }),
      text: async () => "",
    }),
  );
}

function mockFetchFail(status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: async () => "boom",
    }),
  );
}

describe("LLM engine — config (GLM default)", () => {
  it("default: glm-4-flash (teks, gratis), glm-4v-flash (vision), glm-4.6 (strong), base Z.ai", () => {
    delete process.env.GLM_API_KEY;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_VISION_MODEL;
    delete process.env.LLM_STRONG_MODEL;
    const cfg = getLlmConfig();
    expect(cfg.model).toBe("glm-4-flash");
    expect(cfg.visionModel).toBe("glm-4v-flash");
    expect(cfg.strongModel).toBe("glm-4.6");
    expect(cfg.baseUrl).toBe("https://api.z.ai/api/paas/v4");
  });

  it("GLM_API_KEY prioritas, LLM_API_KEY backward-compat", () => {
    process.env.GLM_API_KEY = "key-glm";
    process.env.LLM_API_KEY = "key-llm";
    expect(getLlmConfig().apiKey).toBe("key-glm");
    delete process.env.GLM_API_KEY;
    expect(getLlmConfig().apiKey).toBe("key-llm");
  });

  it("env override model & base URL", () => {
    process.env.LLM_MODEL = "glm-4.6";
    process.env.GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/";
    const cfg = getLlmConfig();
    expect(cfg.model).toBe("glm-4.6");
    expect(cfg.baseUrl).toBe("https://open.bigmodel.cn/api/paas/v4");
  });

  it("isLLMConfigured hanya true saat ada key", () => {
    delete process.env.GLM_API_KEY;
    delete process.env.LLM_API_KEY;
    expect(isLLMConfigured()).toBe(false);
    process.env.GLM_API_KEY = "x";
    expect(isLLMConfigured()).toBe(true);
  });
});

describe("LLM engine — pemanggilan", () => {
  it("chatCompletion memakai model default glm-4-flash + Bearer key", async () => {
    process.env.GLM_API_KEY = "k";
    mockFetchOk("hasil");
    await chatCompletion({ system: "s", user: "u" });
    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("glm-4-flash");
    expect(init.headers).toMatchObject({ Authorization: "Bearer k" });
  });

  it("chatCompletion gagal tanpa key", async () => {
    delete process.env.GLM_API_KEY;
    delete process.env.LLM_API_KEY;
    await expect(chatCompletion({ system: "s", user: "u" })).rejects.toThrow("belum diatur");
  });

  it("visionCompletion memakai glm-4v-flash dan mengirim gambar base64", async () => {
    process.env.GLM_API_KEY = "k";
    mockFetchOk("teks hasil OCR");
    await visionCompletion({ imageBase64: "QUJD", mime: "image/jpeg" });
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("glm-4v-flash");
    expect(body.messages[1].content).toContain("[gambar:image/jpeg;base64:QUJD]");
  });

  it("chatJsonWithFallback: flash sukses → pakai flash, tidak panggil strong", async () => {
    process.env.GLM_API_KEY = "k";
    mockFetchOk('{"ok":true}');
    const { json, model } = await chatJsonWithFallback({ system: "s", user: "u" });
    expect(json).toEqual({ ok: true });
    expect(model).toBe("glm-4-flash");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("chatJsonWithFallback: flash gagal network → retry sekali dengan glm-4.6", async () => {
    process.env.GLM_API_KEY = "k";
    mockFetchFail(500);
    await expect(chatJsonWithFallback({ system: "s", user: "u" })).rejects.toThrow();
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls).toHaveLength(2);
    const first = JSON.parse(String(calls[0]?.[1]?.body));
    const second = JSON.parse(String(calls[1]?.[1]?.body));
    expect(first.model).toBe("glm-4-flash");
    expect(second.model).toBe("glm-4.6");
  });

  it("chatJsonWithFallback: JSON tidak valid dari flash → retry strong", async () => {
    process.env.GLM_API_KEY = "k";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "bukan json" } }] }),
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"ok":1}' } }] }),
        text: async () => "",
      });
    vi.stubGlobal("fetch", fetchMock);
    const { json, model } = await chatJsonWithFallback({ system: "s", user: "u" });
    expect(json).toEqual({ ok: 1 });
    expect(model).toBe("glm-4.6");
  });
});

describe("stripCodeFence", () => {
  it("menghapus pembungkus ```json", () => {
    expect(stripCodeFence("```json\n{\"a\":1}\n```")).toBe('{"a":1}');
  });
  it("teks polos tidak berubah", () => {
    expect(stripCodeFence('{"a":1}')).toBe('{"a":1}');
  });
});

describe("EVENT_RULE_LABELS (EN-06)", () => {
  it("menyediakan label, template, dan referensi PSAK untuk semua event", () => {
    
    const kinds = ["SALES_CREDIT", "SALES_CASH", "PURCHASE", "RECEIPT", "PAYMENT"];
    for (const kind of kinds) {
      const r = EVENT_RULE_LABELS[kind as keyof typeof EVENT_RULE_LABELS];
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.template).toMatch(/^T-\d{3}$/);
      expect(r.psakRef).toMatch(/PSAK/);
    }
  });
});
