import { getDailyBrief } from "@/server/brief";
import { detectAnomalies } from "@/server/anomaly";
import { getDeadlineReminders } from "@/server/deadline";

/**
 * T3.1 — Agent proaktif: pindai inbox firma (dokumen baru, antrian review,
 * anomali, deadline) dan susun satu ringkasan "perlu perhatian" untuk notifikasi
 * periodik (cron / repeatable job). Deterministik — tanpa biaya LLM.
 */

export type InboxScan = {
  needsAttention: boolean;
  headline: string;
  items: Array<{ text: string; href: string }>;
  scannedAt: string;
};

/** Susun headline dari hasil pindai (pure — testable). */
export function buildHeadline(parts: string[]): string {
  const active = parts.filter(Boolean);
  if (active.length === 0) return "Semua aman — tidak ada yang perlu perhatian.";
  return active.join(" · ");
}

/** Pindai inbox firma. */
export async function scanInbox(firmId: string): Promise<InboxScan> {
  const [brief, anomalies, deadlines] = await Promise.all([
    getDailyBrief(firmId),
    detectAnomalies(firmId),
    getDeadlineReminders(firmId),
  ]);

  const items: Array<{ text: string; href: string }> = [];
  const parts: string[] = [];

  for (const i of brief.items) {
    if (i.count > 0) {
      items.push({ text: `${i.count} ${i.text}`, href: i.href });
      parts.push(`${i.count} ${i.text}`);
    }
  }
  for (const a of anomalies) {
    items.push({ text: `${a.count}× ${a.text}`, href: a.href });
    parts.push(`${a.count}× ${a.text}`);
  }
  const urgentDeadline = deadlines.find((d) => d.daysLeft <= 7);
  if (urgentDeadline) {
    items.push({ text: `${urgentDeadline.type} ${urgentDeadline.clientName} (${urgentDeadline.daysLeft} hari)`, href: "/dashboard/sla" });
    parts.push(`Deadline ${urgentDeadline.type} ${urgentDeadline.daysLeft} hari lagi`);
  }

  return {
    needsAttention: items.length > 0,
    headline: buildHeadline(parts),
    items,
    scannedAt: new Date().toISOString(),
  };
}
