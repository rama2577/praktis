import { chatCompletion, isLLMConfigured } from "@/ai/llm";

/**
 * T2.2 — Auto-translation dokumen asing. Dokumen berbahasa asing (mis. Inggris)
 * diterjemahkan ke Indonesia sebelum ekstraksi jurnal. Hanya menyala saat teks
 * terdeteksi dominan asing (hemat biaya LLM).
 */

const EN_STOPWORDS = new Set([
  "the", "and", "of", "to", "in", "for", "is", "are", "a", "an", "on", "at", "from",
  "with", "by", "this", "that", "company", "invoice", "amount", "total", "date", "number",
  "received", "paid", "payment", "tax", "value", "net", "gross", "balance", "account", "sales",
]);

/** Heuristik: dominan bahasa Inggris → perlu terjemah (pure — testable). */
export function looksLikeForeign(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  if (words.length < 20) return false;
  const en = words.filter((w) => EN_STOPWORDS.has(w)).length;
  return en / words.length > 0.12;
}

const TRANSLATE_SYSTEM = `Kamu adalah penerjemah dokumen akuntansi. Terjemahkan teks berikut ke bahasa
Indonesia baku. Pertahankan angka, tanggal, kode, nomor faktur, nama perusahaan, dan
mata uang persis seperti aslinya. Keluarkan HANYA hasil terjemahan (tanpa komentar).`;

/** Terjemahkan ke Indonesia (fallback = teks asli saat LLM off/gagal). */
export async function translateToIndonesian(text: string): Promise<string> {
  if (!isLLMConfigured()) return text;
  try {
    const out = await chatCompletion({ system: TRANSLATE_SYSTEM, user: text.slice(0, 12_000), timeoutMs: 90_000 });
    const trimmed = out.trim();
    return trimmed || text;
  } catch {
    return text;
  }
}

/** Terjemah bila terdeteksi asing; sebaliknya kembalikan teks apa adanya. */
export async function maybeTranslateToIndonesian(text: string): Promise<string> {
  if (!looksLikeForeign(text)) return text;
  return translateToIndonesian(text);
}
