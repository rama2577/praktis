import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * EN-03 · Feedback loop AI — bagian "update rule dari pola".
 *
 * Reviewer mengoreksi baris jurnal → tercatat di `JournalCorrection` (sudah
 * ada via F2.5B). Modul ini mengubah pola koreksi menjadi *saran perbaikan
 * aturan/template* yang bisa ditindaklanjuti. Bersifat read-only & deterministik:
 * ia TIDAK mengubah `rule-engine` (deterministik-dulu) secara otomatis — saran
 * ditampilkan agar akuntan/partner yang memutuskan update.
 */

export type RuleFixSuggestion = {
  /** Kode akun lama (yang terus dikoreksi). */
  before: string;
  /** Kode akun baru (yang benar). */
  after: string;
  /** Frekuensi koreksi before → after. */
  count: number;
  /** Kalimat saran siap-tampil (Bahasa Indonesia). */
  suggestion: string;
};

type CorrectionRow = {
  field: string;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
};

/**
 * Dari koreksi akun (`field === "accountCode"` dengan `before` & `after`
 * non-kosong dan berbeda), deteksi pola "akun X berulang kali dikoreksi jadi Y".
 * Murni & deterministik — mudah di-test.
 *
 * @param corrections baris koreksi (proyeksi `field`/`before`/`after`).
 * @param minCount ambang minimal kemunculan pola agar dianggap sinyal (default 2).
 */
export function suggestRuleFixes(
  corrections: CorrectionRow[],
  minCount = 2,
): RuleFixSuggestion[] {
  const map = new Map<string, { before: string; after: string; count: number }>();

  for (const c of corrections) {
    if (c.field !== "accountCode") continue;
    const before = typeof c.before === "string" ? c.before.trim() : "";
    const after = typeof c.after === "string" ? c.after.trim() : "";
    // Abaikan penambahan baris baru (before kosong), penghapusan baris (after
    // kosong), dan "koreksi" yang tidak mengubah apa pun.
    if (!before || !after || before === after) continue;

    const key = `${before}\u2192${after}`;
    const entry = map.get(key) ?? { before, after, count: 0 };
    entry.count += 1;
    map.set(key, entry);
  }

  return [...map.values()]
    .filter((e) => e.count >= minCount)
    .sort((a, b) => b.count - a.count)
    .map((e) => ({
      before: e.before,
      after: e.after,
      count: e.count,
      suggestion: `Akun ${e.before} dikoreksi ke ${e.after} sebanyak ${e.count}\u00d7. Pertimbangkan update aturan/template agar draft memakai ${e.after}.`,
    }));
}

/**
 * Ambil saran perbaikan aturan untuk sebuah firma dari data koreksi reviewer.
 */
export async function getRuleFixes(firmId: string): Promise<RuleFixSuggestion[]> {
  const rows = await prisma.journalCorrection.findMany({
    where: { firmId },
    select: { field: true, before: true, after: true },
  });
  return suggestRuleFixes(rows, 2);
}
