/**
 * F-6 — Smoke test LLM key nyata (teks + vision opsional).
 *
 * Jalankan (dari root app):
 *   npx tsx --env-file=.env scripts/smoke-llm.ts [gambar.jpg|png]
 *
 * Output memastikan: (1) GLM_API_KEY terbaca, (2) chatCompletion teks hidup,
 * (3) visionCompletion hidup bila path gambar diberikan. Tanpa key, app tetap
 * berfungsi via rule-engine — script ini hanya memverifikasi jalur LLM nyata.
 */
import { readFileSync } from "node:fs";
import {
  getLlmConfig,
  isLLMConfigured,
  chatCompletion,
  visionCompletion,
} from "../src/ai/llm";

(async () => {
  const cfg = getLlmConfig();
  console.log(
    `config → model=${cfg.model} · vision=${cfg.visionModel} · strong=${cfg.strongModel} · base=${cfg.baseUrl}`,
  );

  if (!isLLMConfigured()) {
    console.log("⚠️  GLM_API_KEY belum diset → pipeline jalan via rule-engine (tanpa LLM).");
    return;
  }

  // 1) Teks
  try {
    const t0 = Date.now();
    const out = await chatCompletion({
      system: "Balas singkat.",
      user: "Balas tepat satu kata: OK",
    });
    console.log(`✅ teks OK (${((Date.now() - t0) / 1000).toFixed(1)}s): "${out.trim().slice(0, 60)}"`);
  } catch (e) {
    console.log(`❌ teks GAGAL: ${(e as Error).message}`);
  }

  // 2) Vision (opsional)
  const img = process.argv[2];
  if (img) {
    try {
      const mime = img.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      const b64 = readFileSync(img).toString("base64");
      const t1 = Date.now();
      const v = await visionCompletion({ imageBase64: b64, mime });
      console.log(`✅ vision OK (${((Date.now() - t1) / 1000).toFixed(1)}s): "${v.trim().slice(0, 120)}"`);
    } catch (e) {
      console.log(`❌ vision GAGAL: ${(e as Error).message}`);
    }
  }
})();
