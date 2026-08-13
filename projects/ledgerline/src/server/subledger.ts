/**
 * Subledger (buku besar pembantu) — Gap #1.
 * Master kode bantu (CT-* pelanggan, AP-* pemasok, SH-* pemegang saham) +
 * saldo & buku besar pembantu yang diturunkan dari JournalLine.dimension.subledgerCode.
 *
 * Saldo subledger = openingBalance + Σ (debit − kredit) dari baris jurnal yang
 * memakai dimension.subledgerCode, pada akun yang relevan (semua akun baris tsb).
 */
import { prisma } from "@/lib/db";

const round2 = (n: number) => Math.round(n * 100) / 100;

export type SubledgerWithBalance = {
  id: string;
  code: string;
  name: string;
  type: "CUSTOMER" | "VENDOR" | "SHAREHOLDER" | "OTHER";
  status: "ACTIVE" | "INACTIVE";
  openingBalance: number;
  debit: number;
  credit: number;
  balance: number; // saldo akhir (debit positif)
  lastActivity: string | null;
};

export type SubledgerLedgerRow = {
  date: string;
  bukti: string | null;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number; // running balance
};

export type AgingBucket = {
  bucket: "CURRENT" | "31-60" | "61-90" | "90+";
  label: string;
  amount: number;
};

/** Ambil semua baris jurnal (lines) dengan dimension.subledgerCode utk klien. */
type SubledgerLine = {
  subledgerCode: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  notes: string | null;
  entryDate: Date;
  description: string;
  status: string;
};

async function fetchSubledgerLines(clientId: string, code?: string): Promise<SubledgerLine[]> {
  const raw = await prisma.journalLine.findMany({
    where: {
      journalEntry: { clientId, status: { in: ["APPROVED", "FINALIZED"] } },
      ...(code
        ? { dimension: { path: ["subledgerCode"], equals: code } }
        : { dimension: { string_contains: "subledgerCode" } }),
    },
    select: {
      accountCode: true,
      accountName: true,
      debit: true,
      credit: true,
      dimension: true,
      notes: true,
      journalEntry: { select: { entryDate: true, description: true, status: true } },
    },
    orderBy: { journalEntry: { entryDate: "asc" } },
  });
  const rows: SubledgerLine[] = [];
  for (const r of raw) {
    const dim = (r.dimension ?? {}) as { subledgerCode?: string | null };
    rows.push({
      subledgerCode: dim.subledgerCode ?? "",
      accountCode: r.accountCode,
      accountName: r.accountName,
      debit: Number(r.debit),
      credit: Number(r.credit),
      notes: r.notes,
      entryDate: r.journalEntry.entryDate,
      description: r.journalEntry.description ?? "",
      status: r.journalEntry.status,
    });
  }
  return rows;
}

/** Daftar subledger + saldo (opening + aktivitas). */
export async function listSubledgers(
  clientId: string,
  opts: { type?: string; includeInactive?: boolean } = {},
): Promise<SubledgerWithBalance[]> {
  const masters = await prisma.subledger.findMany({
    where: {
      clientId,
      ...(opts.type ? { type: opts.type as "CUSTOMER" } : {}),
      ...(opts.includeInactive ? {} : { status: "ACTIVE" }),
    },
    orderBy: { code: "asc" },
  });
  const lines = await fetchSubledgerLines(clientId);
  const byCode = new Map<string, { debit: number; credit: number; last: string | null }>();
  for (const l of lines) {
    const agg = byCode.get(l.subledgerCode) ?? { debit: 0, credit: 0, last: null };
    agg.debit += l.debit;
    agg.credit += l.credit;
    const t = l.entryDate.toISOString().slice(0, 10);
    if (!agg.last || t > agg.last) agg.last = t;
    byCode.set(l.subledgerCode, agg);
  }
  return masters.map((m) => {
    const agg = byCode.get(m.code) ?? { debit: 0, credit: 0, last: null };
    return {
      id: m.id,
      code: m.code,
      name: m.name,
      type: m.type,
      status: m.status,
      openingBalance: Number(m.openingBalance),
      debit: round2(agg.debit),
      credit: round2(agg.credit),
      balance: round2(Number(m.openingBalance) + agg.debit - agg.credit),
      lastActivity: agg.last,
    };
  });
}

/** Buku besar pembantu satu subledger (running balance). */
export async function getSubledgerLedger(clientId: string, code: string): Promise<SubledgerLedgerRow[]> {
  const master = await prisma.subledger.findFirst({ where: { clientId, code } });
  if (!master) return [];
  const lines = (await fetchSubledgerLines(clientId, code)).filter((l) => l.subledgerCode === code);
  let running = Number(master.openingBalance);
  const rows: SubledgerLedgerRow[] = [];
  for (const l of lines) {
    running += l.debit - l.credit;
    rows.push({
      date: l.entryDate.toISOString().slice(0, 10),
      bukti: l.notes,
      description: l.description,
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: round2(l.debit),
      credit: round2(l.credit),
      balance: round2(running),
    });
  }
  return rows;
}

const AGING_BUCKETS: { bucket: AgingBucket["bucket"]; label: string; maxDays: number }[] = [
  { bucket: "CURRENT", label: "Belum jatuh tempo (< 30 hari)", maxDays: 30 },
  { bucket: "31-60", label: "31–60 hari", maxDays: 60 },
  { bucket: "61-90", label: "61–90 hari", maxDays: 90 },
  { bucket: "90+", label: "> 90 hari", maxDays: Infinity },
];

/** Fungsi murni aging: saldo per bucket dari baris transaksi (debit − kredit) berdasar umur. */
export function bucketAging(
  lines: { date: string; debit: number; credit: number }[],
  asOf: Date,
): Record<AgingBucket["bucket"], number> {
  const out: Record<string, number> = { CURRENT: 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const l of lines) {
    const days = Math.max(0, Math.floor((asOf.getTime() - new Date(l.date).getTime()) / 86_400_000));
    const net = l.debit - l.credit;
    const bucket = AGING_BUCKETS.find((b) => days < b.maxDays)?.bucket ?? "90+";
    out[bucket] += net;
  }
  return out as Record<AgingBucket["bucket"], number>;
}

/**
 * Aging piutang per pelanggan (CUSTOMER).
 * Saldo per bucket dihitung dari transaksi (debit − kredit) pada akun piutang,
 * dikelompokkan berdasarkan umur tanggal transaksi terhadap asOf.
 */
export async function getAging(
  clientId: string,
  asOf: Date = new Date(),
): Promise<{ code: string; name: string; total: number; buckets: AgingBucket[] }[]> {
  const masters = await prisma.subledger.findMany({
    where: { clientId, type: "CUSTOMER", status: "ACTIVE" },
    orderBy: { code: "asc" },
  });
  const lines = (await fetchSubledgerLines(clientId)).filter((l) => l.subledgerCode && masters.some((m) => m.code === l.subledgerCode));
  const byCode = new Map<string, { total: number; buckets: Map<string, number> }>();
  for (const m of masters) byCode.set(m.code, { total: Number(m.openingBalance), buckets: new Map() });

  for (const l of lines) {
    const agg = byCode.get(l.subledgerCode);
    if (!agg) continue;
    const net = l.debit - l.credit;
    agg.total += net;
    const day = l.entryDate.toISOString().slice(0, 10);
    const bucketed = bucketAging([{ date: day, debit: l.debit, credit: l.credit }], asOf);
    for (const [b, v] of Object.entries(bucketed)) agg.buckets.set(b, (agg.buckets.get(b) ?? 0) + v);
  }

  return [...byCode.entries()]
    .map(([code, agg]) => ({
      code,
      name: masters.find((m) => m.code === code)!.name,
      total: round2(agg.total),
      buckets: AGING_BUCKETS.map((b) => ({ bucket: b.bucket, label: b.label, amount: round2(agg.buckets.get(b.bucket) ?? 0) })),
    }))
    .sort((a, b) => b.total - a.total);
}
