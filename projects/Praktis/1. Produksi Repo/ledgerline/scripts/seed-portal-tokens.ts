/**
 * Seed token portal utk semua klien firma demo (ledgerline-demo).
 * Idempotent: upsert → token lama invalid, token baru valid 30 hari.
 * Jalankan: npx tsx scripts/seed-portal-tokens.ts
 */
import { prisma } from "../src/lib/db";
import { ensurePortalToken } from "../src/server/portal";

async function main() {
  const firm = await prisma.firm.findUnique({ where: { slug: "ledgerline-demo" } });
  if (!firm) {
    console.log("Firma demo (ledgerline-demo) tidak ditemukan.");
    return;
  }
  const clients = await prisma.client.findMany({
    where: { firmId: firm.id },
    orderBy: { name: "asc" },
  });
  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  console.log(`Firma: ${firm.name} — ${clients.length} klien`);
  for (const c of clients) {
    const token = await ensurePortalToken(c.id);
    const path = `/portal/${token.token}`;
    console.log(`  ${c.name}\n    → ${baseUrl}${path}\n    → kedaluwarsa ${token.expiresAt.toISOString()}`);
  }
}

main().finally(() => prisma.$disconnect());
