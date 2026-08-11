/**
 * F6A — Seed demo mutasi bank untuk CV Berkah Abadi (periode 2026-07).
 * Idempotent: importMutations skip duplikat (deskripsi+jumlah+tanggal).
 * Menautkan ke dokumen rekening-koran-berkah-0726.xlsx bila ada.
 */
import { PrismaClient } from "@prisma/client";
import { importMutations } from "../src/server/recon";

const prisma = new PrismaClient();

async function main() {
  const firm = await prisma.firm.findFirst({ where: { name: { contains: "Berkah" } } });
  if (!firm) {
    const f = await prisma.firm.findFirst();
    if (!f) throw new Error("Tidak ada firma — jalankan prisma/seed.ts dulu.");
    console.log("Firma 'Berkah' tidak ditemukan, pakai firma pertama:", f.name);
  }
  const firmId = firm?.id ?? (await prisma.firm.findFirstOrThrow()).id;

  const client = await prisma.client.findFirst({ where: { name: "CV Berkah Abadi" } });
  if (!client) {
    console.log("⚠️ CV Berkah Abadi tidak ada — lewati seed mutasi bank.");
    return;
  }

  const doc = await prisma.document.findFirst({
    where: { clientId: client.id, fileName: { contains: "rekening-koran" } },
  });

  const period = "2026-07";
  const items = [
    { date: new Date(Date.UTC(2026, 6, 3)), description: "Setoran tunai pemilik", amount: 25_000_000 },
    { date: new Date(Date.UTC(2026, 6, 5)), description: "Pembayaran supplier ATK", amount: -4_850_000 },
    { date: new Date(Date.UTC(2026, 6, 8)), description: "Transfer masuk penjualan #INV-001", amount: 12_500_000 },
    { date: new Date(Date.UTC(2026, 6, 12)), description: "Pembayaran gaji karyawan", amount: -6_750_000 },
    { date: new Date(Date.UTC(2026, 6, 15)), description: "Setoran PPN Masa Juni", amount: -2_310_000 },
    { date: new Date(Date.UTC(2026, 6, 20)), description: "Transfer masuk penjualan #INV-002", amount: 8_900_000 },
    { date: new Date(Date.UTC(2026, 6, 25)), description: "Biaya admin bank", amount: -25_000 },
    { date: new Date(Date.UTC(2026, 6, 28)), description: "Pembayaran sewa kantor", amount: -3_500_000 },
  ];

  const created = await importMutations(
    items.map((i) => ({ firmId, clientId: client.id, period, ...i, documentId: doc?.id ?? null })),
  );
  console.log(`CV Berkah Abadi ${period}: ${created} mutasi baru (${items.length - created} duplikat skip).`);
}

main()
  .then(() => seedCashJournals())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/** Jurnal kas APPROVED yang cocok dengan mutasi bank (agar saran AI hidup). */
async function seedCashJournals() {
  const client = await prisma.client.findFirst({ where: { name: "CV Berkah Abadi" } });
  if (!client) return;
  const firmId = client.firmId;
  const actor = await prisma.user.findFirst({ where: { firmId } });
  const period = "2026-07";

  const journals = [
    {
      description: "Penerimaan penjualan tunai #INV-001",
      date: new Date(Date.UTC(2026, 6, 8, 12)),
      lines: [
        { accountCode: "1-1000", accountName: "Kas", debit: 12_500_000, credit: 0 },
        { accountCode: "4-1000", accountName: "Pendapatan Penjualan", debit: 0, credit: 12_500_000 },
      ],
    },
    {
      description: "Penerimaan penjualan tunai #INV-002",
      date: new Date(Date.UTC(2026, 6, 20, 12)),
      lines: [
        { accountCode: "1-1000", accountName: "Kas", debit: 8_900_000, credit: 0 },
        { accountCode: "4-1000", accountName: "Pendapatan Penjualan", debit: 0, credit: 8_900_000 },
      ],
    },
    {
      description: "Pembayaran ATK & perlengkapan kantor",
      date: new Date(Date.UTC(2026, 6, 5, 12)),
      lines: [
        { accountCode: "5-1100", accountName: "Beban ATK & Perlengkapan", debit: 4_850_000, credit: 0 },
        { accountCode: "1-1000", accountName: "Kas", debit: 0, credit: 4_850_000 },
      ],
    },
    {
      description: "Pembayaran gaji karyawan Juli",
      date: new Date(Date.UTC(2026, 6, 12, 12)),
      lines: [
        { accountCode: "5-1200", accountName: "Beban Gaji", debit: 6_750_000, credit: 0 },
        { accountCode: "1-1000", accountName: "Kas", debit: 0, credit: 6_750_000 },
      ],
    },
  ];

  let created = 0;
  for (const j of journals) {
    const existing = await prisma.journalEntry.findFirst({
      where: { clientId: client.id, description: j.description, status: "APPROVED" },
    });
    if (existing) continue;
    await prisma.journalEntry.create({
      data: {
        firmId,
        clientId: client.id,
        status: "APPROVED",
        confidence: 0.98,
        description: j.description,
        createdByAi: true,
        journalType: "AI",
        entryDate: j.date,
        lines: { create: j.lines },
        activities: {
          create: {
            firmId,
            userId: actor?.id ?? "seed",
            action: "JOURNAL_CREATED",
            detail: `${j.description} — ${period} (seed F6A)`,
          },
        },
      },
    });
    created += 1;
  }
  console.log(`Jurnal kas demo: ${created} baru.`);
}


