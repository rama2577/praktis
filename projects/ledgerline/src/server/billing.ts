/**
 * F-5 — Billing kuota-only per klien + paywall SPT Tahunan.
 *
 * Kebijakan (disetujui, lihat docs/analisis-komersial-pricing.md):
 *   - Model kuota-only per klien: Mikro 100tx · Low 500tx · Middle 1.000tx per bulan.
 *   - Over-quota: Rp350/tx.
 *   - Modul SPT Tahunan di-paywall via `Firm.annualPaidAt`.
 *
 * Usage dihitung dari baris jurnal APPROVED (JournalLine → JournalEntry.status=APPROVED)
 * dalam periode (bulan) berdasarkan `entryDate`.
 */

import { prisma } from "@/lib/db";

/** Kuota default bila klien tidak punya override (tier "Low"). */
export const DEFAULT_QUOTA_MONTHLY = 500;

export type Usage = {
  period: string;
  used: number;
  quota: number;
  overQuota: number;
  remaining: number;
};

/** "YYYY-MM" bulan berjalan (waktu lokal). */
export function currentPeriod(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Kuota bulanan efektif klien: override klien → default tier. */
export async function getClientQuota(clientId: string): Promise<number> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { quotaMonthly: true },
  });
  return client?.quotaMonthly ?? DEFAULT_QUOTA_MONTHLY;
}

/** Jumlah baris jurnal APPROVED pada periode (batas [start, end) UTC). */
export async function countApprovedLines(clientId: string, period: string): Promise<number> {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return prisma.journalLine.count({
    where: {
      journalEntry: {
        clientId,
        status: "APPROVED",
        entryDate: { gte: start, lt: end },
      },
    },
  });
}

/** Ringkasan pemakaian kuota klien pada satu periode. */
export async function getUsage(clientId: string, period: string): Promise<Usage> {
  const [used, quota] = await Promise.all([
    countApprovedLines(clientId, period),
    getClientQuota(clientId),
  ]);
  const overQuota = Math.max(0, used - quota);
  return { period, used, quota, overQuota, remaining: Math.max(0, quota - used) };
}

/** Hitung & simpan UsageMeter (idempoten per clientId+period). */
export async function recountUsageMeter(clientId: string, period: string): Promise<Usage> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { firmId: true },
  });
  if (!client) throw new Error("Klien tidak ditemukan");
  const u = await getUsage(clientId, period);
  await prisma.usageMeter.upsert({
    where: { clientId_period: { clientId, period } },
    create: {
      firmId: client.firmId,
      clientId,
      period,
      lineCount: u.used,
      overQuota: u.overQuota,
    },
    update: { lineCount: u.used, overQuota: u.overQuota, countedAt: new Date() },
  });
  return u;
}

/**
 * Paywall SPT Tahunan. Saat `BILLING_ENFORCE !== "true"` (default: dev/demo),
 * modul selalu terbuka. Saat enforce aktif, butuh `annualPaidAt` ≤ 1 tahun.
 */
export async function isSptAnnualUnlocked(firmId: string): Promise<boolean> {
  if (process.env.BILLING_ENFORCE !== "true") return true;
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { annualPaidAt: true },
  });
  if (!firm?.annualPaidAt) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return firm.annualPaidAt.getTime() >= cutoff.getTime();
}

/** Overview billing seluruh klien aktif firma pada satu periode. */
export async function getFirmBillingOverview(firmId: string, period: string) {
  const clients = await prisma.client.findMany({
    where: { firmId, status: "ACTIVE" },
    select: { id: true, name: true, quotaMonthly: true },
    orderBy: { name: "asc" },
  });
  const rows = await Promise.all(
    clients.map(async (c) => {
      const u = await getUsage(c.id, period);
      return {
        clientId: c.id,
        clientName: c.name,
        quota: u.quota,
        used: u.used,
        overQuota: u.overQuota,
        remaining: u.remaining,
      };
    }),
  );
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { billingMode: true, annualPaidAt: true },
  });
  return {
    period,
    billingMode: firm?.billingMode ?? "QUOTA_ONLY",
    sptAnnualUnlocked: firm?.annualPaidAt ? true : false,
    annualPaidAt: firm?.annualPaidAt ?? null,
    totalQuota: rows.reduce((s, r) => s + r.quota, 0),
    totalUsed: rows.reduce((s, r) => s + r.used, 0),
    totalOverQuota: rows.reduce((s, r) => s + r.overQuota, 0),
    clients: rows,
  };
}
