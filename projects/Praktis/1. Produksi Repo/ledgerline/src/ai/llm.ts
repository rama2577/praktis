/**
 * LLM Engine — primary GLM (Zhipu AI). OpenAI-compatible endpoint.
 *
 * Model routing (semua bisa di-override env):
 * - `model`        : teks/draft  → **glm-4-flash**  (GRATIS, default)
 * - `visionModel`  : OCR gambar  → **glm-4v-flash** (GRATIS, default)
 * - `strongModel`  : retry kualitas → **glm-4.6**    (berbayar, dipakai hemat)
 *
 * Strategi biaya: flash dulu untuk semua dokumen rutin; strong model hanya
 * dipakai otomatis saat flash gagal (network/parse) — lihat chatJsonWithFallback.
 * Fallback terakhir tetap rule engine (src/ai/rule-engine.ts) — tanpa API key,
 * app tetap berfungsi dengan akurasi deterministik.
 */

export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  /** Model teks default (gratis): glm-4-flash */
  model: string;
  /** Model vision/OCR default (gratis): glm-4v-flash */
  visionModel: string;
  /** Model kuat untuk retry: glm-4.6 */
  strongModel: string;
};

export function getLlmConfig(): LlmConfig {
  return {
    // GLM_API_KEY adalah var utama; LLM_API_KEY dipertahankan untuk backward-compat.
    apiKey: process.env.GLM_API_KEY ?? process.env.LLM_API_KEY ?? "",
    baseUrl: (
      process.env.GLM_BASE_URL ??
      process.env.LLM_BASE_URL ??
      "https://api.z.ai/api/paas/v4"
    ).replace(/\/$/, ""),
    model: process.env.LLM_MODEL ?? "glm-4-flash",
    visionModel: process.env.LLM_VISION_MODEL ?? "glm-4v-flash",
    strongModel: process.env.LLM_STRONG_MODEL ?? "glm-4.6",
  };
}

export function isLLMConfigured(): boolean {
  return Boolean(getLlmConfig().apiKey);
}

export type ChatOptions = {
  system: string;
  user: string;
  json?: boolean;
  /** Override model — biasanya tidak perlu; default = glm-4-flash. */
  model?: string;
  timeoutMs?: number;
};

export async function chatCompletion(opts: ChatOptions): Promise<string> {
  const cfg = getLlmConfig();
  if (!cfg.apiKey) throw new Error("GLM_API_KEY (atau LLM_API_KEY) belum diatur");
  const model = opts.model ?? cfg.model;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
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

/**
 * Prompt OCR akuntansi — dipakai utk semua jalur vision (default & retry).
 * Instruksi eksplisit: lengkap, presisi angka/PPN, tanpa ringkasan.
 */
export const OCR_SYSTEM_PROMPT = `Kamu adalah ekstraktor dokumen akuntansi presisi tinggi.
Ekstrak SEMUA teks dari gambar dokumen ini SECARA LENGKAP dan berurutan, termasuk:
- angka nominal & jumlah (perhatikan pemisah ribuan/desimal),
- tanggal, nomor faktur/kuitansi/PO, nama pihak, NPWP, alamat,
- rincian PPN (DPP, PPN, total), diskon, dan keterangan lain.
JANGAN meringkas, mengoreksi, atau menebak angka yang tidak terbaca — tulis persis seperti di dokumen.
Jika ada bagian tidak jelas, beri tanda [??] pada posisinya.
Jawab hanya dengan teks hasil ekstraksi, tanpa pembuka/penutup.`;

/**
 * Vision OCR — default `glm-4v-flash` (gratis). Gambar dikirim base64 inline
 * (format OpenAI-compatible, didukung GLM API).
 */
export async function visionCompletion(opts: {
  imageBase64: string;
  mime: string;
  system?: string;
  /** Override model OCR (mis. strongModel utk retry kualitas). */
  model?: string;
  timeoutMs?: number;
}): Promise<string> {
  return chatCompletion({
    system: opts.system ?? OCR_SYSTEM_PROMPT,
    user: `[gambar:${opts.mime};base64:${opts.imageBase64}]`,
    model: opts.model ?? getLlmConfig().visionModel,
    timeoutMs: opts.timeoutMs ?? 90_000,
  });
}

/**
 * Chat JSON dengan fallback ganda:
 * 1) coba model default (glm-4-flash — gratis)
 * 2) jika gagal (network / HTTP / JSON parse) → retry sekali dengan strong model
 * Return JSON hasil parse + model yang berhasil dipakai (untuk observability).
 */
export async function chatJsonWithFallback(opts: {
  system: string;
  user: string;
  timeoutMs?: number;
}): Promise<{ json: unknown; model: string }> {
  const cfg = getLlmConfig();

  const attempt = async (model: string): Promise<unknown> => {
    const content = await chatCompletion({ ...opts, json: true, model });
    return JSON.parse(stripCodeFence(content)) as unknown;
  };

  try {
    return { json: await attempt(cfg.model), model: cfg.model };
  } catch (firstErr) {
    if (cfg.strongModel && cfg.strongModel !== cfg.model) {
      try {
        return { json: await attempt(cfg.strongModel), model: cfg.strongModel };
      } catch {
        throw firstErr;
      }
    }
    throw firstErr;
  }
}

/** Hapus pembungkus markdown (```json ... ```) dari respons LLM. */
export function stripCodeFence(content: string): string {
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}
