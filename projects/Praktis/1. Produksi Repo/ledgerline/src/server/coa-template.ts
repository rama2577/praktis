/**
 * Template COA per industri (Gap #2).
 * Baca src/ai/knowledge/coa-<industri>.csv → coaMapping klien
 * (format ClientProfile.coaMapping: { kode: { accountCode, accountName, posLaporan } }).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { INDUSTRY_COA_FILE } from "@/lib/industries";
import type { Industry } from "@prisma/client";

const KB_DIR = path.join(process.cwd(), "src", "ai", "knowledge");

export type CoaTemplateRow = {
  kode: string;
  nama: string;
  tipe: string;
  nature: string;
  subNature: string;
  laporan: string;
  psakRef: string;
  keterangan: string;
};

export type CoaMappingEntry = { accountCode: string; accountName: string; posLaporan?: string };

/** Parse baris CSV template (format tanpa quoted comma — data internal aman). */
export function parseCoaCsv(csv: string): CoaTemplateRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  const [header, ...rest] = lines;
  if (!header || !/^kode/i.test(header)) return [];
  return rest
    .map((l) => {
      const c = l.split(",");
      if (c.length < 6 || !c[0]?.trim()) return null;
      return {
        kode: c[0]!.trim(),
        nama: c[1]?.trim() ?? "",
        tipe: c[2]?.trim() ?? "",
        nature: c[3]?.trim() ?? "",
        subNature: c[4]?.trim() ?? "",
        laporan: c[5]?.trim() ?? "",
        psakRef: c[6]?.trim() ?? "",
        keterangan: c[7]?.trim() ?? "",
      };
    })
    .filter((r): r is CoaTemplateRow => r !== null && r.nama !== "");
}

export async function loadCoaTemplate(industry: string): Promise<CoaTemplateRow[]> {
  const file = INDUSTRY_COA_FILE[industry as Industry];
  if (!file) return [];
  try {
    const csv = await readFile(path.join(KB_DIR, file), "utf8");
    return parseCoaCsv(csv);
  } catch {
    return [];
  }
}

/** Template → coaMapping klien (ClientProfile.coaMapping). */
export async function coaMappingFromTemplate(industry: string): Promise<Record<string, CoaMappingEntry>> {
  const rows = await loadCoaTemplate(industry);
  const out: Record<string, CoaMappingEntry> = {};
  for (const r of rows) {
    out[r.kode] = {
      accountCode: r.kode,
      accountName: r.nama,
      posLaporan: r.laporan === "Neraca" ? "NRC" : r.laporan === "Laba Rugi" ? "LR" : undefined,
    };
  }
  return out;
}
