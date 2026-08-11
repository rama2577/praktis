/**
 * F6A — Rekonsiliasi Bank (M6).
 * Inti murni: AI matching suggestion (mutasi bank ↔ jurnal kas), outstanding items,
 * ringkasan & laporan CSV. Wrapper DB untuk import mutasi & simpan match.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ── Tipe ─────────────────────────────────────────────────────────────────────

export type CashJournalLine = {
  journalId: string;
  entryDate: string;
  description: string | null;
  accountCode: string;
  accountName: string;
  debit: number; // kas masuk
  credit: number; // kas keluar
};

export type BankMutationRow = {
  id: string;
  date: string;
  description: string;
  amount: number; // + masuk, - keluar
  matchStatus: "UNMATCHED" | "MATCHED" | "MANUAL";
  matchedJournalId: string | null;
  matchScore: number | null;
};

export type MatchSuggestion = {
  mutationId: string;
  mutationDate: string;
  mutationDescription: string;
  mutationAmount: number;
  journalId: string;
  journalDate: string;
  journalDescription: string | null;
  journalAmount: number; // debit untuk masuk, credit untuk keluar
  score: number;
  reason: string;
};

// ── Matching (pure) ──────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((da.getTime() - db.getTime()) / 86_400_000);
}

/**
 * Saran AI: pasangkan mutasi bank dengan jurnal kas.
 * - Jumlah sama & tanggal dekat (±3 hari) → skor 1.0
 * - Jumlah sama & tanggal beda → 0.85
 * - Jumlah sama & deskripsi mengandung kata kunci → bonus kecil
 * Ambang saran: skor ≥ 0.8.
 */
export function suggestMatches(
  mutations: BankMutationRow[],
  journals: CashJournalLine[],
  threshold = 0.8,
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  const usedJournals = new Set<string>();

  const unusedMutations = mutations.filter((m) => m.matchStatus === "UNMATCHED");

  for (const m of unusedMutations) {
    let best: { journal: CashJournalLine; score: number; reason: string } | null = null;

    for (const j of journals) {
      if (usedJournals.has(j.journalId)) continue;
      const jAmount = m.amount > 0 ? j.debit : j.credit;
      if (jAmount <= 0) continue;
      // Bandingkan nilai absolut dengan toleransi pembulatan Rp100
      if (Math.abs(Math.abs(m.amount) - jAmount) > 100) continue;

      const diff = Math.abs(daysBetween(m.date, j.entryDate));
      let score: number;
      let reason: string;
      if (diff <= 3) {
        score = 1.0;
        reason = "Jumlah sama & tanggal dekat";
      } else if (diff <= 15) {
        score = 0.85;
        reason = "Jumlah sama, tanggal ±15 hari";
      } else {
        continue;
      }

      // Bonus kecil jika deskripsi saling terkait
      const mDesc = m.description.toLowerCase();
      const jDesc = (j.description ?? "").toLowerCase();
      if (mDesc.includes("transfer") && jDesc.includes("transfer")) score += 0.02;
      if (mDesc.includes("pembayaran") && jDesc.includes("pembayaran")) score += 0.02;
      if (mDesc.includes("penjualan") && jDesc.includes("penjualan")) score += 0.02;
      score = Math.min(1, Math.round(score * 100) / 100);

      if (!best || score > best.score) {
        best = { journal: j, score, reason };
      }
    }

    if (best && best.score >= threshold) {
      suggestions.push({
        mutationId: m.id,
        mutationDate: m.date,
        mutationDescription: m.description,
        mutationAmount: m.amount,
        journalId: best.journal.journalId,
        journalDate: best.journal.entryDate,
        journalDescription: best.journal.description,
        journalAmount: m.amount > 0 ? best.journal.debit : best.journal.credit,
        score: best.score,
        reason: best.reason,
      });
      usedJournals.add(best.journal.journalId);
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}

// ── Ringkasan & outstanding (pure) ───────────────────────────────────────────

export type ReconSummary = {
  period: string;
  totalMutations: number;
  totalMatched: number;
  bankIn: number;
  bankOut: number;
  bookIn: number;
  bookOut: number;
  outstandingMutations: { id: string; date: string; description: string; amount: number }[];
  outstandingJournals: { journalId: string; date: string; description: string | null; amount: number }[];
};

export function buildReconSummary(
  period: string,
  mutations: BankMutationRow[],
  journals: CashJournalLine[],
): ReconSummary {
  const matchedIds = new Set(mutations.filter((m) => m.matchStatus !== "UNMATCHED").map((m) => m.matchedJournalId ?? ""));

  const outstandingMutations = mutations
    .filter((m) => m.matchStatus === "UNMATCHED")
    .map((m) => ({ id: m.id, date: m.date, description: m.description, amount: m.amount }));

  const outstandingJournals = journals
    .filter((j) => !matchedIds.has(j.journalId))
    .map((j) => ({
      journalId: j.journalId,
      date: j.entryDate,
      description: j.description,
      amount: j.debit > 0 ? j.debit : -j.credit,
    }));

  return {
    period,
    totalMutations: mutations.length,
    totalMatched: mutations.length - outstandingMutations.length,
    bankIn: Math.round(mutations.filter((m) => m.amount > 0).reduce((s, m) => s + m.amount, 0) * 100) / 100,
    bankOut: Math.round(mutations.filter((m) => m.amount < 0).reduce((s, m) => s + Math.abs(m.amount), 0) * 100) / 100,
    bookIn: Math.round(journals.reduce((s, j) => s + j.debit, 0) * 100) / 100,
    bookOut: Math.round(journals.reduce((s, j) => s + j.credit, 0) * 100) / 100,
    outstandingMutations,
    outstandingJournals,
  };
}

/** Laporan rekonsiliasi CSV (BOM UTF-8). */
export function reconCsv(summary: ReconSummary, clientName: string): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [];
  lines.push(esc(`REKONSILIASI BANK — ${clientName} — ${summary.period}`));
  lines.push(["Total mutasi", summary.totalMutations, "Tercocok", summary.totalMatched].map(esc).join(","));
  lines.push(["Mutasi masuk (bank)", summary.bankIn, "Mutasi keluar (bank)", summary.bankOut].map(esc).join(","));
  lines.push(["Kas masuk (buku)", summary.bookIn, "Kas keluar (buku)", summary.bookOut].map(esc).join(","));
  lines.push(esc("OUTSTANDING — MUTASI TANPA JURNAL"));
  for (const m of summary.outstandingMutations) {
    lines.push([m.date.slice(0, 10), m.description, m.amount].map(esc).join(","));
  }
  lines.push(esc("OUTSTANDING — JURNAL TANPA MUTASI"));
  for (const j of summary.outstandingJournals) {
    lines.push([j.date.slice(0, 10), j.description ?? "", j.amount].map(esc).join(","));
  }
  return lines.join("\n");
}

// ── Wrapper DB ───────────────────────────────────────────────────────────────

const CASH_ACCOUNTS = ["1-1000", "1-1100"];

/** Jurnal kas klien per periode (APPROVED/FINALIZED). */
export async function getCashJournals(clientId: string, period: string): Promise<CashJournalLine[]> {
  const p = /^(\d{4})-(\d{2})$/.exec(period);
  if (!p) throw new Error("Format periode: YYYY-MM.");
  const year = Number(p[1]);
  const month = Number(p[2]);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const journals = await prisma.journalEntry.findMany({
    where: {
      clientId,
      status: { in: ["APPROVED", "FINALIZED"] },
      entryDate: { gte: start, lt: end },
    },
    select: {
      id: true,
      description: true,
      entryDate: true,
      lines: {
        where: { accountCode: { in: CASH_ACCOUNTS } },
        select: { accountCode: true, accountName: true, debit: true, credit: true },
      },
    },
    orderBy: { entryDate: "asc" },
  });

  const rows: CashJournalLine[] = [];
  for (const j of journals) {
    for (const l of j.lines) {
      rows.push({
        journalId: j.id,
        entryDate: j.entryDate.toISOString(),
        description: j.description,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: Number(l.debit),
        credit: Number(l.credit),
      });
    }
  }
  return rows;
}

/** Mutasi bank klien per periode. */
export async function getBankMutations(clientId: string, period: string): Promise<BankMutationRow[]> {
  const rows = await prisma.bankMutation.findMany({
    where: { clientId, period },
    orderBy: { date: "asc" },
  });
  return rows.map((m) => ({
    id: m.id,
    date: m.date.toISOString(),
    description: m.description,
    amount: Number(m.amount),
    matchStatus: m.matchStatus,
    matchedJournalId: m.matchedJournalId,
    matchScore: m.matchScore,
  }));
}

export type CreateMutationInput = {
  firmId: string;
  clientId: string;
  period: string;
  date: Date;
  description: string;
  amount: number;
  documentId?: string | null;
  notes?: string | null;
};

/** Import baris mutasi bank (idempotent per deskripsi+jumlah+tanggal). */
export async function importMutations(items: CreateMutationInput[]): Promise<number> {
  let created = 0;
  for (const item of items) {
    const existing = await prisma.bankMutation.findFirst({
      where: {
        clientId: item.clientId,
        period: item.period,
        description: item.description,
        amount: new Prisma.Decimal(item.amount),
        date: item.date,
      },
    });
    if (existing) continue;
    await prisma.bankMutation.create({
      data: {
        firmId: item.firmId,
        clientId: item.clientId,
        period: item.period,
        date: item.date,
        description: item.description.trim(),
        amount: new Prisma.Decimal(item.amount),
        documentId: item.documentId ?? null,
        notes: item.notes ?? null,
      },
    });
    created += 1;
  }
  return created;
}

/** Simpan match (atau lepas match dengan null). */
export async function setMutationMatch(
  mutationId: string,
  firmId: string,
  clientId: string,
  matchedJournalId: string | null,
  manual = false,
): Promise<BankMutationRow> {
  const mutation = await prisma.bankMutation.findFirst({
    where: { id: mutationId, firmId, clientId },
  });
  if (!mutation) throw new Error("Mutasi bank tidak ditemukan.");

  if (matchedJournalId) {
    const journal = await prisma.journalEntry.findFirst({
      where: { id: matchedJournalId, firmId, clientId, status: { in: ["APPROVED", "FINALIZED"] } },
    });
    if (!journal) throw new Error("Jurnal tujuan tidak valid (harus APPROVED/FINALIZED milik klien).");
  }

  const updated = await prisma.bankMutation.update({
    where: { id: mutationId },
    data: {
      matchedJournalId,
      matchStatus: matchedJournalId ? (manual ? "MANUAL" : "MATCHED") : "UNMATCHED",
      matchScore: matchedJournalId && !manual ? 1 : null,
    },
  });
  return {
    id: updated.id,
    date: updated.date.toISOString(),
    description: updated.description,
    amount: Number(updated.amount),
    matchStatus: updated.matchStatus,
    matchedJournalId: updated.matchedJournalId,
    matchScore: updated.matchScore,
  };
}

/** Tandai rekonsiliasi selesai (validasi ringan: semua mutasi sudah di-match). */
export async function completeReconciliation(clientId: string, period: string, _actorId: string) {
  const mutations = await getBankMutations(clientId, period);
  const unmatched = mutations.filter((m) => m.matchStatus === "UNMATCHED");
  return {
    period,
    total: mutations.length,
    matched: mutations.length - unmatched.length,
    unmatched: unmatched.length,
    complete: unmatched.length === 0,
    message:
      unmatched.length === 0
        ? "Rekonsiliasi selesai — semua mutasi tercocok."
        : `${unmatched.length} mutasi belum tercocok — rekonsiliasi ditandai belum selesai.`,
  };
}
