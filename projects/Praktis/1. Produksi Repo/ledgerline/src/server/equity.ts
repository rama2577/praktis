/**
 * Gap #5 — Aktivitas ekuitas periode: setoran modal & prive/dividen
 * dari jurnal APPROVED/FINALIZED, untuk Laporan Perubahan Ekuitas.
 */
import { prisma } from "@/lib/db";
import type { EquityActivity } from "@/server/financial-statements";

const isAkunModal = (code: string, name: string): boolean => {
  const c = code.trim();
  const n = name.toLowerCase();
  if (n.includes("laba") || n.includes("prive") || n.includes("dividen")) return false;
  // Akun laba berbahasa Inggris (retained earnings / accumulated profit) BUKAN modal.
  if (n.includes("profit") || n.includes("loss") || n.includes("retained") || n.includes("earnings")) return false;
  return /^3100/.test(c) || /^3-101/.test(c) || (n.includes("modal") && !n.includes("berjalan"));
};

const isAkunPrive = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes("prive") || n.includes("pribadi") || n.includes("dividen");
};

/** Hitung setoran modal & prive dari jurnal periode (kredit modal = setoran; debit prive = penarikan). */
export async function getEquityActivity(clientId: string, period: string): Promise<EquityActivity> {
  const p = /^(\d{4})-(\d{2})$/.exec(period);
  if (!p) return { setoranModal: 0, prive: 0 };
  const year = Number(p[1]);
  const month = Number(p[2]);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const journals = await prisma.journalEntry.findMany({
    where: { clientId, status: { in: ["APPROVED", "FINALIZED"] }, entryDate: { gte: start, lt: end } },
    select: { lines: { select: { accountCode: true, accountName: true, debit: true, credit: true } } },
  });

  let setoranModal = 0;
  let prive = 0;
  for (const j of journals) {
    for (const l of j.lines) {
      if (isAkunModal(l.accountCode, l.accountName)) {
        setoranModal += Number(l.credit) - Number(l.debit); // kredit = setoran, debit = pengembalian
      }
      if (isAkunPrive(l.accountName)) {
        prive += Number(l.debit) - Number(l.credit);
      }
    }
  }
  return { setoranModal: Math.round(setoranModal * 100) / 100, prive: Math.round(prive * 100) / 100 };
}
