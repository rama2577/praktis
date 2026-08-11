import { prisma } from "../src/lib/db";

/** Seed F5A — 2 aset demo utk PT Maju Jaya (idempotent). */
async function main() {
  const client = await prisma.client.findFirst({ where: { name: "PT Maju Jaya" }, include: { firm: true } });
  if (!client) throw new Error("PT Maju Jaya tidak ditemukan");

  const existing = await prisma.fixedAsset.count({ where: { clientId: client.id } });
  if (existing > 0) {
    console.log(`seed skip — ${existing} aset sudah ada`);
    return;
  }

  await prisma.fixedAsset.createMany({
    data: [
      {
        firmId: client.firmId,
        clientId: client.id,
        name: "Mobil Operasional",
        category: "Kendaraan",
        purchaseDate: new Date("2025-03-01"),
        purchaseCost: new (await import("@prisma/client")).Prisma.Decimal(320_000_000),
        residualValue: new (await import("@prisma/client")).Prisma.Decimal(20_000_000),
        method: "STRAIGHT_LINE",
        commercialLifeMonths: 96,
        fiscalGroup: "K2",
        notes: "Toyota Innova — dipakai direktur",
      },
      {
        firmId: client.firmId,
        clientId: client.id,
        name: "Komputer & Peralatan Kantor",
        category: "Peralatan",
        purchaseDate: new Date("2026-01-01"),
        purchaseCost: new (await import("@prisma/client")).Prisma.Decimal(48_000_000),
        residualValue: new (await import("@prisma/client")).Prisma.Decimal(0),
        method: "DECLINING_BALANCE",
        commercialLifeMonths: 48,
        fiscalGroup: "K1",
        notes: "Saldo menurun 2x",
      },
    ],
  });
  console.log("seed F5A: 2 aset dibuat");
}

main().finally(() => prisma.$disconnect());
