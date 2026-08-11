/**
 * F6B — Seed dimensi demo (proyek/channel) pada jurnal PT Maju Jaya 2026-08.
 * Idempotent: hanya mengisi baris yang belum punya dimensi.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.findFirst({ where: { name: "PT Maju Jaya" } });
  if (!client) {
    console.log("⚠️ PT Maju Jaya tidak ada — lewati.");
    return;
  }

  const start = new Date(Date.UTC(2026, 7, 1));
  const end = new Date(Date.UTC(2026, 8, 1));
  const journals = await prisma.journalEntry.findMany({
    where: { clientId: client.id, entryDate: { gte: start, lt: end } },
    select: { id: true, description: true, lines: { select: { id: true, accountCode: true, dimension: true } } },
  });

  const targets: { match: string; dimension: { project?: string; channel?: string } }[] = [
    { match: "INV-012", dimension: { project: "Proyek Alpha", channel: "Offline" } },
    { match: "INV-008", dimension: { project: "Proyek Beta", channel: "Online" } },
    { match: "INV-001", dimension: { project: "Proyek Alpha", channel: "Offline" } },
    { match: "INV-002", dimension: { project: "Proyek Alpha", channel: "Online" } },
    { match: "INV-003", dimension: { project: "Proyek Beta", channel: "Offline" } },
    { match: "INV-004", dimension: { project: "Proyek Beta", channel: "Online" } },
    { match: "INV-005", dimension: { project: "Proyek Alpha", channel: "Online" } },
    { match: "Pembelian stok", dimension: { channel: "Online" } },
  ];

  let updated = 0;
  for (const j of journals) {
    const target = targets.find((t) => j.description?.includes(t.match));
    if (!target) continue;
    for (const l of j.lines) {
      if (l.dimension) continue;
      await prisma.journalLine.update({
        where: { id: l.id },
        data: { dimension: target.dimension },
      });
      updated += 1;
    }
  }
  console.log(`Dimensi terisi: ${updated} baris jurnal (PT Maju Jaya 2026-08).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
