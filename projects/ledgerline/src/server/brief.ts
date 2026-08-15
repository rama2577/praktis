import { prisma } from "@/lib/db";
import type { JournalStatus } from "@prisma/client";

/**
 * T1.3 — Inbox cerdas akuntan: ringkasan harian (Daily Brief) + antrian review terprioritas.
 * Deterministik (tanpa LLM) — cepat & tanpa biaya; ringkas agregat jadi kalimat aksi.
 */

export type BriefItem = { kind: string; text: string; count: number; href: string };
export type PriorityItem = { id: string; clientName: string; status: JournalStatus; createdAt: string };
export type DailyBrief = { summary: string; items: BriefItem[]; priorityQueue: PriorityItem[]; generatedAt: string };

const REVIEW_STATUSES: JournalStatus[] = ["DRAFT", "JUNIOR_REVIEW", "SENIOR_REVIEW", "TAX_REVIEW", "PARTNER_APPROVAL"];

/** Susun kalimat ringkasan deterministik dari item. */
export function buildBriefSummary(items: BriefItem[]): string {
  const active = items.filter((i) => i.count > 0);
  if (active.length === 0) return "Semua beres — tidak ada antrian yang menunggu.";
  return `Hari ini: ${active.map((i) => `${i.count} ${i.text}`).join(" · ")}.`;
}

export async function getDailyBrief(firmId: string): Promise<DailyBrief> {
  const since = new Date(Date.now() - 86_400_000);

  const [pendingDocs, reviewCount, exceptionCount, reviewQueue] = await Promise.all([
    prisma.document.count({ where: { firmId, status: { in: ["PENDING", "PROCESSING"] }, createdAt: { gte: since } } }),
    prisma.journalEntry.count({ where: { firmId, status: { in: REVIEW_STATUSES } } }),
    prisma.journalEntry.count({ where: { firmId, status: "EXCEPTION" } }),
    prisma.journalEntry.findMany({
      where: { firmId, status: { in: [...REVIEW_STATUSES, "EXCEPTION"] } },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const items: BriefItem[] = [
    { kind: "documents", text: "dokumen baru menunggu proses", count: pendingDocs, href: "/dashboard/pipeline" },
    { kind: "review", text: "jurnal menunggu review", count: reviewCount, href: "/dashboard/review" },
    { kind: "exception", text: "exception perlu tindakan", count: exceptionCount, href: "/dashboard/exceptions" },
  ];

  return {
    summary: buildBriefSummary(items),
    items,
    priorityQueue: reviewQueue.map((j) => ({
      id: j.id,
      clientName: j.client.name,
      status: j.status,
      createdAt: j.createdAt.toISOString(),
    })),
    generatedAt: new Date().toISOString(),
  };
}
