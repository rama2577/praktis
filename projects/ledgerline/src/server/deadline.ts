import { prisma } from "@/lib/db";

/**
 * T3.3 — Pengingat deadline pelaporan (SPT & rekonsiliasi) untuk klien aktif.
 * Kalender Indonesia: PPN masa = akhir bulan berikutnya; PPh 21/23 = tgl 20
 * bulan berikutnya; SPT Tahunan Badan = 30 April.
 */

export type DeadlineReminder = { type: string; due: string; daysLeft: number; clientName: string };

const MS_DAY = 86_400_000;

/** Hitung tanggal deadline kalender berikutnya (pure — testable). */
export function nextDeadlineDates(now: Date): Array<{ type: string; due: Date }> {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  const endOfNextMonth = new Date(y, m + 2, 0); // hari terakhir bulan berikutnya
  const pph20 = new Date(y, m + 1, 20); // tgl 20 bulan berikutnya
  const annual = new Date(y, 3, 30); // 30 April tahun berjalan

  const out: Array<{ type: string; due: Date }> = [
    { type: "SPT Masa PPN", due: endOfNextMonth },
    { type: "SPT Masa PPh 21/23", due: pph20 },
  ];
  // SPT Tahunan: jika 30 April sudah lewat, gunakan tahun depan.
  out.push({ type: "SPT Tahunan Badan", due: annual > now ? annual : new Date(y + 1, 3, 30) });
  return out;
}

/** Daftar pengingat deadline (≤ 45 hari) untuk semua klien aktif. */
export async function getDeadlineReminders(firmId: string, now = new Date()): Promise<DeadlineReminder[]> {
  const clients = await prisma.client.findMany({ where: { firmId, status: "ACTIVE" }, select: { name: true } });
  const dates = nextDeadlineDates(now);
  const out: DeadlineReminder[] = [];

  for (const c of clients) {
    for (const d of dates) {
      const daysLeft = Math.ceil((d.due.getTime() - now.getTime()) / MS_DAY);
      if (daysLeft >= 0 && daysLeft <= 45) {
        out.push({ type: d.type, due: d.due.toISOString().slice(0, 10), daysLeft, clientName: c.name });
      }
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
