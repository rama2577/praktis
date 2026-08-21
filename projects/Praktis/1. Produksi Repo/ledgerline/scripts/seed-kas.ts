/**
 * Seed transaksi kas realistis — PT Maju Jaya, periode 2026-08.
 * Tujuan: perbaiki saldo kas negatif (demo arus kas) TANPA mengubah laba rugi.
 * 1) Setoran modal tunai pemilik → kas positif & struktur modal realistis.
 * 2) Penerimaan pembayaran piutang → piutang tertagih.
 * Idempotent: skip jika jurnal dengan deskripsi sama sudah ada.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FIRM_EMAIL = "admin@ledgerline.dev";
const CLIENT_NAME = "PT Maju Jaya";
const PERIOD = "2026-08";

async function main() {
  const firm = await prisma.user.findFirst({
    where: { email: FIRM_EMAIL },
    select: { firmId: true },
  });
  if (!firm) throw new Error(`User ${FIRM_EMAIL} tidak ditemukan`);
  const client = await prisma.client.findFirst({ where: { firmId: firm.firmId, name: CLIENT_NAME } });
  if (!client) throw new Error(`Klien ${CLIENT_NAME} tidak ditemukan`);

  const JOURNALS = [
    {
      description: "Setoran modal tunai pemilik",
      date: "2026-08-03",
      lines: [
        { accountCode: "1-1000", accountName: "Kas", debit: 30_000_000, credit: 0 },
        { accountCode: "3-1000", accountName: "Modal Usaha", debit: 0, credit: 30_000_000 },
      ],
    },
    {
      description: "Penerimaan pembayaran piutang dari PT Nusantara",
      date: "2026-08-10",
      lines: [
        { accountCode: "1-1000", accountName: "Kas", debit: 20_535_000, credit: 0 },
        { accountCode: "1-1200", accountName: "Piutang Usaha", debit: 0, credit: 20_535_000 },
      ],
    },
  ];

  let created = 0;
  for (const j of JOURNALS) {
    const existing = await prisma.journalEntry.findFirst({
      where: { clientId: client.id, description: j.description },
    });
    if (existing) {
      console.log(`skip (sudah ada): ${j.description}`);
      continue;
    }
    await prisma.journalEntry.create({
      data: {
        firmId: firm.firmId,
        clientId: client.id,
        status: "APPROVED",
        confidence: 1,
        description: j.description,
        exceptionFlag: null,
        createdByAi: false,
        journalType: "MANUAL",
        entryDate: new Date(`${j.date}T09:00:00+07:00`),
        lines: {
          create: j.lines.map((l) => ({
            accountCode: l.accountCode,
            accountName: l.accountName,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
    });
    created++;
    console.log(`created: ${j.description} (${j.date})`);
  }
  console.log(`Selesai. ${created} jurnal baru untuk ${CLIENT_NAME} ${PERIOD}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
