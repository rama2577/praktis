import { chatCompletion, isLLMConfigured } from "@/ai/llm";
import { getDailyBrief } from "@/server/brief";
import { getDashboardData } from "@/server/dashboard";

/**
 * T2.1 — Command bar AI (⌘K): tanya data firma, minta draft, minta penjelasan.
 * Jawaban dari LLM (fallback deterministik saat LLM off).
 */

export type CommandIntent = "ask" | "draft" | "explain" | "help";

const HELP_TEXT =
  "Saya asisten AI Praktis. Contoh yang bisa Anda tanyakan:\n" +
  "• \"Berapa klien aktif dan transaksi hari ini?\" (tanya data)\n" +
  "• \"Buat jurnal penyesuaian untuk penyusutan\" (minta draft)\n" +
  "• \"Jelaskan PSAK 71 untuk piutang\" (penjelasan)\n" +
  "Saya tidak melakukan aksi tulis — Anda tetap yang menyetujui setiap perubahan.";

/** Klasifikasi intent dari query (pure — testable). */
export function classifyIntent(query: string): CommandIntent {
  const q = query.toLowerCase();
  if (/saldo|kas|berapa|berapa banyak|total|posisi|ringkas|rekap|klien aktif|transaksi|jurnal berapa|dokumen berapa|outstanding|piutang|hutang|umur/.test(q)) return "ask";
  if (/buat|draft|catat|jurnal untuk|jurnal penyesuaian|posting|usulkan/.test(q)) return "draft";
  if (/jelaskan|apa itu|mengapa|kenapa|definisi|artinya|pengertian|psak|ppn|pph|spt|rekonsiliasi|depresiasi|amortisasi/.test(q)) return "explain";
  return "help";
}

const AI_COMMAND_SYSTEM = `Kamu adalah asisten AI Praktis — platform bookkeeping untuk kantor akuntan Indonesia.
Jawab singkat, jelas, bahasa Indonesia baku. Jika menjawab dari data firma, kutip angkanya.
Jangan mengarang angka yang tidak ada di konteks. Untuk permintaan draft jurnal, berikan
saran baris (akun + nominal contoh) dan ingatkan bahwa akuntan yang menyetujui.`;

function fallbackAnswer(intent: CommandIntent): string {
  switch (intent) {
    case "ask":
      return "Saya butuh koneksi AI untuk menjawab dari data firma. Pastikan saldo AI aktif, atau lihat langsung di panel Hari Ini dashboard.";
    case "draft":
      return "Untuk membuat jurnal, gunakan halaman Jurnal → Jurnal Manual, atau upload dokumen dan biarkan AI membuat draft otomatis.";
    case "explain":
      return "Saya butuh koneksi AI untuk menjelaskan istilah akuntansi/pajak.";
    default:
      return HELP_TEXT;
  }
}

export async function answerCommand(query: string, firmId: string): Promise<{ intent: CommandIntent; answer: string }> {
  const intent = classifyIntent(query);
  if (!isLLMConfigured()) return { intent, answer: fallbackAnswer(intent) };

  let context = "";
  if (intent === "ask") {
    try {
      const [brief, kpi] = await Promise.all([getDailyBrief(firmId), getDashboardData(firmId)]);
      context = [
        "DATA FIRMA (konteks):",
        `Ringkasan hari ini: ${brief.summary}`,
        `Klien aktif: ${kpi.activeClients} · transaksi hari ini: ${kpi.transactionsToday} · jurnal AI draft: ${kpi.aiDraftJobs} · antrian review: ${kpi.reviewJobs} · breach SLA: ${kpi.slaBreachCount}`,
        "",
      ].join("\n");
    } catch {
      context = "";
    }
  }

  try {
    const answer = await chatCompletion({
      system: AI_COMMAND_SYSTEM,
      user: `${context}PERTANYAAN PENGGUNA:\n${query}`,
      timeoutMs: 60_000,
    });
    return { intent, answer: answer.trim() || fallbackAnswer(intent) };
  } catch {
    return { intent, answer: fallbackAnswer(intent) };
  }
}
