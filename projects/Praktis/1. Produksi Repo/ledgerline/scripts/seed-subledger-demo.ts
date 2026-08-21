/**
 * Seed demo — Subledger & Aging (Gap #1).
 * Untuk klien yang di-import dari kertas kerja (jurnal aslinya tidak memakai
 * kode bantu): hubungkan baris piutang ke master CT-* dan tambahkan transaksi
 * berumur bervariasi agar aging terisi (current / 31-60 / 61-90 / 90+).
 *
 * Jalankan: npx tsx scripts/seed-subledger-demo.ts [clientId]
 * (tanpa clientId → klien pertama yang namanya mengandung "ARYA USAHA TIRTA")
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedSubledgerDemo(clientId: string) {
  const firm = await prisma.client.findFirst({ where: { id: clientId }, select: { firmId: true } });
  if (!firm) throw new Error("Klien tidak ditemukan");

  // 1. Hubungkan baris piutang (1-102-*) yang ada ke CT-001 / CT-002 bergantian.
  const lines = await prisma.journalLine.findMany({
    where: { journalEntry: { clientId }, accountCode: { startsWith: "1-102-" } },
    select: { id: true },
  });
  let n = 0;
  for (const l of lines) {
    await prisma.journalLine.update({
      where: { id: l.id },
      data: { dimension: { subledgerCode: n++ % 2 === 0 ? "CT-001" : "CT-002" } },
    });
  }

  // 2. Tambahkan jurnal piutang berumur bervariasi + pembayaran parsial.
  const mk = async (date: string, bukti: string, desc: string, subledger: string, debit: number, credit: number, account: string) => {
    await prisma.journalEntry.create({
      data: {
        firmId: firm.firmId,
        clientId,
        status: "APPROVED",
        confidence: 1,
        description: desc,
        createdByAi: false,
        journalType: "MANUAL",
        entryDate: new Date(date),
        lines: {
          create: [
            {
              accountCode: account,
              accountName: account.startsWith("1-102") ? "Receivable - Trade" : "CIMB Niaga - Acc. No: 800171592300",
              debit,
              credit,
              notes: bukti,
              dimension: { subledgerCode: subledger },
            },
          ],
        },
      },
    });
  };
  // Piutang baru dengan umur berbeda (asOf = 2026-08-13)
  await mk("2026-08-05", "INV-00240", "Room 3 (Agustus)", "CT-001", 5_000_000, 0, "1-102-001");
  await mk("2026-07-15", "INV-00220", "Event Juli", "CT-001", 4_000_000, 0, "1-102-001");
  await mk("2026-06-10", "INV-00200", "Event Juni", "CT-002", 3_000_000, 0, "1-102-001");
  await mk("2026-05-10", "INV-00180", "Event Mei", "CT-002", 2_000_000, 0, "1-102-001");
  // Pembayaran parsial CT-001 (mengurangi bucket current)
  await mk("2026-08-10", "PAY-0099", "Pembayaran CT-001", "CT-001", 0, 2_000_000, "1-101-010");

  return { linkedLines: lines.length, journalsAdded: 5 };
}

// Standalone: jalankan sebagai script.
if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  const finder = target
    ? prisma.client.findFirst({ where: { id: target } })
    : prisma.client.findFirst({ where: { name: { contains: "ARYA USAHA TIRTA" } } });
  finder
    .then(async (c) => {
      if (!c) throw new Error("Klien tidak ditemukan");
      const r = await seedSubledgerDemo(c.id);
      console.log(`✅ ${c.name}: ${r.linkedLines} baris piutang di-link, ${r.journalsAdded} jurnal demo ditambahkan.`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
