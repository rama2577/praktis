import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Industry } from "@prisma/client";
import { chatJsonWithFallback, isLLMConfigured } from "@/ai/llm";
import { buildDraftJournal, type DraftResult, type RuleLine } from "@/ai/rule-engine";
import { validateDraftLines } from "@/ai/validation";

const KB_DIR = path.join(process.cwd(), "src", "ai", "knowledge");

export const COA_FILES: Record<Industry, string> = {
  RETAIL: "coa-retail.csv",
  SERVICES: "coa-services.csv",
  FNB: "coa-fnb.csv",
};

export async function loadKnowledgeFile(name: string): Promise<string> {
  return readFile(path.join(KB_DIR, name), "utf8");
}

/**
 * Susun draft jurnal dari teks dokumen.
 * Strategi: rule engine dulu (deterministik); LLM dipakai hanya jika
 * dikonfigurasi (LLM_API_KEY) DAN confidence rule engine rendah.
 */
export async function draftJournalFromText(opts: {
  text: string;
  industry: string;
  docType: string;
  /** EN-02: hint COA klien (dari ClientProfile READY) — override akun klien. */
  coaMappingHint?: string | null;
}): Promise<DraftResult> {
  const ruleResult = buildDraftJournal(opts.text, opts);

  if (isLLMConfigured() && ruleResult.confidence < 0.6) {
    try {
      const llmResult = await draftWithLLM(opts);
      if (llmResult && llmResult.lines.length > 0) {
        return { ...llmResult, template: ruleResult.template ?? llmResult.template };
      }
    } catch {
      // Fallback ke hasil rule engine
    }
  }

  return ruleResult;
}

async function draftWithLLM(opts: {
  text: string;
  industry: string;
  docType: string;
  coaMappingHint?: string | null;
}): Promise<DraftResult | null> {
  const [templates, businessEvents, taxPpn, coa] = await Promise.all([
    loadKnowledgeFile("journal-templates.md"),
    loadKnowledgeFile("business-events.md"),
    loadKnowledgeFile("tax-rules-ppn.md"),
    loadKnowledgeFile(COA_FILES[opts.industry as Industry] ?? "coa-services.csv"),
  ]);

  const system = `Kamu adalah AI bookkeeper Indonesia untuk kantor akuntan. Susun draft jurnal dari dokumen klien.

ATURAN WAJIB:
1. Selalu mulai dari business event, BUKAN langsung COA.
2. Gunakan template jurnal & COA yang diberikan. JANGAN invent akun.
3. PPN 11% jika ada keterangan PPN/pajak.
4. Setiap baris WAJIB punya psakRef (traceability).
5. Format Rupiah: Rp 1.500.000 (titik ribuan).
6. Balance: total debit HARUS sama dengan total kredit.
7. Jika dokumen tidak jelas, isi exceptionFlag (jangan mengarang).

TEMPLATE JURNAL:
${templates.slice(0, 4000)}

BUSINESS EVENTS:
${businessEvents.slice(0, 3000)}

ATURAN PPN:
${taxPpn.slice(0, 2000)}

COA (industri ${opts.industry}):
${coa.slice(0, 3000)}

${opts.coaMappingHint ? `${opts.coaMappingHint}
Gunakan pemetaan di atas: kode akun di jurnal WAJIB memakai accountCode standar yang sudah dipetakan dari COA klien.` : ""}

RESPONS (JSON saja):
{
  "description": "ringkasan transaksi",
  "event": "SALES_CREDIT | SALES_CASH | PURCHASE | RECEIPT | PAYMENT | null",
  "lines": [{ "accountCode": "...", "accountName": "...", "debit": 0, "credit": 0, "psakRef": "...", "notes": "..." }],
  "confidence": 0.0,
  "exceptionFlag": null
}`;

  // GLM-4-Flash default (gratis); fallback otomatis ke strong model (glm-4.6)
  // jika flash gagal network/parse — lihat chatJsonWithFallback.
  const { json } = await chatJsonWithFallback({
    system,
    user: `Jenis dokumen: ${opts.docType}\nIndustri klien: ${opts.industry}\n\nISI DOKUMEN:\n${opts.text.slice(0, 8000)}`,
    timeoutMs: 90_000,
  });

  const parsed = json as {
    description?: string;
    event?: string | null;
    lines?: RuleLine[];
    confidence?: number;
    exceptionFlag?: string | null;
  };

  const lines = (parsed.lines ?? []).map((l) => ({
    ...l,
    debit: Math.round(Number(l.debit ?? 0) * 100) / 100,
    credit: Math.round(Number(l.credit ?? 0) * 100) / 100,
  }));

  const validation = validateDraftLines(lines);
  if (!validation.ok) return null;

  return {
    description: parsed.description ?? "Draft dari LLM",
    detectedEvent: parsed.event ?? null,
    template: null,
    lines,
    confidence: Math.min(Math.max(Number(parsed.confidence ?? 0), 0), 1),
    exceptionFlag: parsed.exceptionFlag ?? null,
  };
}
