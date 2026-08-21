/**
 * F5B-Lanjutan — Seed jurnal PPh 23 (jasa teknik) PT Maju Jaya 2026-08,
 * agar export e-Bupot XML punya isi. Idempotent per deskripsi.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.findFirst({ where: { name: "PT Maju Jaya" } });
  if (!client) {
    console.log("⚠️ PT Maju Jaya tidak ada — lewati.");
    return;
  }
  const description = "Jasa teknik konsultan — PPh 23 dipotong";
  const existing = await prisma.journalEntry.findFirst({ where: { clientId: client.id, description, status: "APPROVED" } });
  if (existing) {
    console.log("Sudah ada — skip.");
    return;
  }

  const actor = await prisma.user.findFirst({ where: { firmId: client.firmId } });
  await prisma.journalEntry.create({
    data: {
      firmId: client.firmId,
      clientId: client.id,
      status: "APPROVED",
      confidence: 0.97,
      description,
      createdByAi: true,
      journalType: "AI",
      entryDate: new Date(Date.UTC(2026, 7, 18, 12)),
      lines: {
        create: [
          { accountCode: "5-1400", accountName: "Beban Jasa Teknik", debit: 10_000_000, credit: 0, taxCode: "PPH23-104", taxBase: 10_000_000, notes: "npwp:08.765.432.1-900.000" },
          { accountCode: "2-1100", accountName: "Utang Usaha", debit: 0, credit: 9_800_000 },
          { accountCode: "2-2300", accountName: "Utang PPh 23", debit: 0, credit: 200_000, taxCode: "PPH23-104", taxBase: 10_000_000 },
        ],
      },
      activities: {
        create: {
          firmId: client.firmId,
          userId: actor?.id ?? "seed",
          action: "JOURNAL_CREATED",
          detail: `${description} — 2026-08 (seed F5B lanjutan)`,
        },
      },
    },
  });
  console.log("Jurnal PPh 23 dibuat.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
