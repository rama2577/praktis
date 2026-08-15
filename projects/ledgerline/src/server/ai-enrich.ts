import { chatJsonWithFallback, isLLMConfigured } from "@/ai/llm";

/**
 * Batch-enrich baris jurnal (Lark-inspired "AI Field").
 * Satu panggilan LLM untuk BANYAK baris (hemat biaya) → deskripsi naratif per baris.
 * Fallback ke rule-engine (deskripsi deterministik) saat LLM tidak ada / gagal.
 */

export type EnrichInputLine = {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  notes: string | null;
};

export type EnrichResultLine = {
  id: string;
  description: string;
  confidence: number; // 0–1
  source: "AI" | "RULE";
};

/** Deskripsi deterministik (fallback / non-LLM). */
export function ruleDescription(line: EnrichInputLine): string {
  const isDebit = line.debit > 0;
  const amount = isDebit ? line.debit : line.credit;
  const direction = isDebit ? "Debit" : "Kredit";
  const rp = Math.round(amount).toLocaleString("id-ID");
  const base = `${line.accountName} (${line.accountCode}) — ${direction} Rp ${rp}`;
  return line.notes ? `${base} · ${line.notes}` : base;
}

const ENRICH_SYSTEM = `Kamu adalah asisten akuntansi Indonesia yang presisi. Untuk setiap baris jurnal,
buat deskripsi naratif singkat (maks 60 karakter) yang jelas dan siap audit.
Gunakan bahasa Indonesia baku. Jangan mengarang angka atau akun — hanya merangkai
dari akun, jumlah, dan keterangan yang diberikan.
Balas HANYA JSON array dengan format:
[{"id":"<id baris>","description":"<deskripsi>","confidence":0.0-1.0}]`;

/** Enrich deskripsi untuk banyak baris sekaligus (1 call LLM). */
export async function enrichJournalLines(lines: EnrichInputLine[]): Promise<EnrichResultLine[]> {
  if (lines.length === 0) return [];

  if (!isLLMConfigured()) {
    return lines.map((l) => ({ id: l.id, description: ruleDescription(l), confidence: 0.6, source: "RULE" as const }));
  }

  const payload = lines.map((l) => ({
    id: l.id,
    akun: l.accountName,
    kode: l.accountCode,
    debit: l.debit,
    kredit: l.credit,
    keterangan: l.notes ?? "",
  }));

  try {
    const { json } = await chatJsonWithFallback({ system: ENRICH_SYSTEM, user: JSON.stringify(payload) });
    const arr = Array.isArray(json) ? json : (json as { lines?: unknown[] })?.lines ?? [];

    const byId = new Map<string, { description: string; confidence: number }>();
    for (const item of arr) {
      if (item && typeof item === "object") {
        const o = item as { id?: string; description?: string; confidence?: number };
        if (o.id && typeof o.description === "string" && o.description.trim()) {
          byId.set(o.id, { description: o.description.trim(), confidence: typeof o.confidence === "number" ? o.confidence : 0.85 });
        }
      }
    }

    return lines.map((l) => {
      const ai = byId.get(l.id);
      if (ai) return { id: l.id, description: ai.description, confidence: ai.confidence, source: "AI" as const };
      return { id: l.id, description: ruleDescription(l), confidence: 0.6, source: "RULE" as const };
    });
  } catch {
    return lines.map((l) => ({ id: l.id, description: ruleDescription(l), confidence: 0.5, source: "RULE" as const }));
  }
}
