import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/** Direktori knowledge base (salinan referensi skill ledgerline). */
export const KNOWLEDGE_DIR = path.join(process.cwd(), "src", "ai", "knowledge");

export type KnowledgeEntry = {
  name: string;
  ext: string;
  category: string;
  sizeBytes: number;
  preview: string;
};

/** Kategorikan nama file → grup knowledge (pure, unit-testable). */
export function knowledgeCategory(name: string): string {
  if (name.startsWith("coa-")) return "Chart of Accounts (COA)";
  if (name.startsWith("tax-")) return "Peraturan Pajak";
  if (name.includes("business-events")) return "Business Events";
  if (name.includes("journal-templates")) return "Template Jurnal";
  if (name.includes("validation")) return "Validasi & Materialitas";
  if (name.includes("psak")) return "Referensi PSAK";
  if (name.includes("closing")) return "Prosedur Closing";
  if (name.includes("materiality")) return "Validasi & Materialitas";
  if (name.includes("industry")) return "Referensi Industri";
  if (name.includes("accounting-skills")) return "Keterampilan Akuntansi";
  return "Lainnya";
}

const PREVIEW_LIMIT = 800;

/** Baca seluruh file knowledge: nama, kategori, ukuran, preview isi. */
export async function listKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const names = (await readdir(KNOWLEDGE_DIR)).filter((n) => n.startsWith(".") === false).sort();
  const entries: KnowledgeEntry[] = [];
  for (const name of names) {
    const filePath = path.join(KNOWLEDGE_DIR, name);
    const meta = await stat(filePath);
    if (!meta.isFile()) continue;
    const ext = path.extname(name).slice(1).toUpperCase();
    const content = await readFile(filePath, "utf8");
    entries.push({
      name,
      ext,
      category: knowledgeCategory(name),
      sizeBytes: meta.size,
      preview: content.slice(0, PREVIEW_LIMIT),
    });
  }
  return entries;
}
