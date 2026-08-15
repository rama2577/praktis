/**
 * Seed — isi ClientProfile.coaMapping untuk SEMUA klien dari template COA
 * industri. Diperlukan dropdown COA (search abjad) di editor jurnal review.
 *
 * Idempotent (upsert). Jalankan di container: npx tsx prisma/seed-client-coa.ts
 */
import { PrismaClient } from "@prisma/client";
import { coaMappingFromTemplate } from "../src/server/coa-template";

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true, industry: true, firmId: true },
  });
  for (const c of clients) {
    const mapping = await coaMappingFromTemplate(c.industry);
    const count = Object.keys(mapping).length;
    await prisma.clientProfile.upsert({
      where: { clientId: c.id },
      create: { clientId: c.id, firmId: c.firmId, coaMapping: mapping },
      update: { coaMapping: mapping },
    });
    console.log(`✅ ${c.name} (${c.industry}): ${count} akun COA`);
  }
  console.log("Selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
