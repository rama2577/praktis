/**
 * Klien LLM OpenAI-compatible — primary GLM (Z.ai), fallback OpenAI/Ollama.
 * Provider diganti cukup lewat env: LLM_BASE_URL + LLM_MODEL + LLM_API_KEY.
 */
export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function getLlmConfig(): LlmConfig {
  return {
    apiKey: process.env.LLM_API_KEY ?? "",
    baseUrl: (process.env.LLM_BASE_URL ?? "https://api.z.ai/api/paas/v4").replace(/\/$/, ""),
    model: process.env.LLM_MODEL ?? "glm-4.6",
  };
}

export function isLLMConfigured(): boolean {
  return Boolean(getLlmConfig().apiKey);
}

export async function chatCompletion(opts: {
  system: string;
  user: string;
  json?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  const { apiKey, baseUrl, model } = getLlmConfig();
  if (!apiKey) throw new Error("LLM_API_KEY belum diatur");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        temperature: 0.2,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`LLM API ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("LLM mengembalikan konten kosong");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/** Hapus pembungkus markdown (```json ... ```) dari respons LLM. */
export function stripCodeFence(content: string): string {
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}
