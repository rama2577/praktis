import { prisma } from "@/lib/db";

/**
 * T1.4 — Alert anomali: deteksi hal yang perlu perhatian akuntan
 * (SLA breach, mutasi bank belum cocok, exception terbuka) → satu kalimat aksi.
 */

export type Anomaly = { type: string; severity: "high" | "medium"; text: string; count: number; href: string };

export type AnomalyCounts = { slaBreach: number; unmatched: number; exceptions: number };

/** Susun daftar anomali dari hitungan (pure — testable). */
export function buildAnomalies(c: AnomalyCounts): Anomaly[] {
  const out: Anomaly[] = [];
  if (c.slaBreach > 0) out.push({ type: "sla", severity: "high", text: "task melewati tenggat SLA", count: c.slaBreach, href: "/dashboard/sla" });
  if (c.unmatched > 0) out.push({ type: "recon", severity: "medium", text: "mutasi bank belum dicocokkan (rekonsiliasi)", count: c.unmatched, href: "/dashboard/recon" });
  if (c.exceptions > 0) out.push({ type: "exception", severity: "medium", text: "exception belum terselesaikan", count: c.exceptions, href: "/dashboard/exceptions" });
  return out;
}

/** Deteksi anomali untuk satu firma. */
export async function detectAnomalies(firmId: string): Promise<Anomaly[]> {
  const [slaBreach, unmatched, exceptions] = await Promise.all([
    prisma.slaEvent.count({ where: { firmId, status: "BREACHED" } }),
    prisma.bankMutation.count({ where: { firmId, matchStatus: "UNMATCHED" } }),
    prisma.journalEntry.count({ where: { firmId, status: "EXCEPTION" } }),
  ]);
  return buildAnomalies({ slaBreach, unmatched, exceptions });
}
