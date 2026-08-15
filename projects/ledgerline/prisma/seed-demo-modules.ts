/**
 * Seed — data demo untuk modul yang masih sepi agar deck/manual lebih hidup:
 * 1. FixedAsset + DepreciationSchedule (Jan–Agu 2026)
 * 2. Subledger (piutang & hutang dagang)
 * 3. ClientProfile.reportTemplates (Laporan Custom AI)
 *
 * Idempotent (upsert/delete-then-create). Jalankan: npx tsx prisma/seed-demo-modules.ts
 */
import { PrismaClient, SubledgerType, DepreciationMethod, FixedAssetStatus } from "@prisma/client";

const prisma = new PrismaClient();

type AssetSpec = {
  name: string;
  category: string;
  cost: number;
  lifeMonths: number;
  fiscalGroup: string;
  purchase: string; // ISO date
};

type ClientSeed = {
  name: string;
  assets: AssetSpec[];
  subledgers: { code: string; name: string; type: SubledgerType; opening: number }[];
  templates: { name: string; kind: string; description: string; groupBy?: "project" | "channel" | null }[];
};

const PERIODS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];

const SEEDS: ClientSeed[] = [
  {
    name: "PT Maju Jaya",
    assets: [
      { name: "Kendaraan Operasional", category: "Kendaraan", cost: 150_000_000, lifeMonths: 96, fiscalGroup: "K2", purchase: "2024-03-15" },
      { name: "Peralatan Toko & Display", category: "Peralatan", cost: 40_000_000, lifeMonths: 48, fiscalGroup: "K1", purchase: "2024-06-01" },
      { name: "Komputer & Mesin Kasir", category: "Peralatan", cost: 25_000_000, lifeMonths: 48, fiscalGroup: "K1", purchase: "2025-01-10" },
    ],
    subledgers: [
      { code: "CT-001", name: "Pelanggan Toko Jakarta", type: SubledgerType.CUSTOMER, opening: 45_000_000 },
      { code: "CT-002", name: "Pelanggan Toko Bandung", type: SubledgerType.CUSTOMER, opening: 30_000_000 },
      { code: "AP-001", name: "Supplier Elektronik", type: SubledgerType.VENDOR, opening: 20_000_000 },
    ],
    templates: [
      { name: "Arus Kas Bulanan", kind: "ARUS_KAS", description: "Pergerakan kas masuk & keluar per bulan" },
      { name: "Penjualan per Channel", kind: "PENJUALAN_PER_CHANNEL", description: "Omzet per kanal penjualan", groupBy: "channel" },
      { name: "Analisis Beban Operasional", kind: "BEBAN", description: "Rincian beban usaha per kategori" },
    ],
  },
  {
    name: "CV Berkah Abadi",
    assets: [
      { name: "Kendaraan Operasional", category: "Kendaraan", cost: 120_000_000, lifeMonths: 96, fiscalGroup: "K2", purchase: "2024-05-20" },
      { name: "Peralatan Kantor", category: "Peralatan", cost: 18_000_000, lifeMonths: 48, fiscalGroup: "K1", purchase: "2025-02-01" },
    ],
    subledgers: [
      { code: "CT-001", name: "Pelanggan Jasa", type: SubledgerType.CUSTOMER, opening: 25_000_000 },
      { code: "AP-001", name: "Vendor Subkontraktor", type: SubledgerType.VENDOR, opening: 12_000_000 },
    ],
    templates: [
      { name: "Arus Kas Bulanan", kind: "ARUS_KAS", description: "Pergerakan kas masuk & keluar per bulan" },
      { name: "Pendapatan per Proyek", kind: "PENDAPATAN_PER_PROYEK", description: "Pendapatan jasa per proyek", groupBy: "project" },
      { name: "Analisis Beban Operasional", kind: "BEBAN", description: "Rincian beban usaha per kategori" },
    ],
  },
  {
    name: "PT Sentosa",
    assets: [
      { name: "Peralatan Dapur", category: "Peralatan", cost: 60_000_000, lifeMonths: 48, fiscalGroup: "K1", purchase: "2024-08-01" },
      { name: "Peralatan Restoran", category: "Peralatan", cost: 35_000_000, lifeMonths: 48, fiscalGroup: "K1", purchase: "2025-01-15" },
    ],
    subledgers: [
      { code: "CT-001", name: "Pelanggan Korporat", type: SubledgerType.CUSTOMER, opening: 15_000_000 },
      { code: "AP-001", name: "Supplier Bahan Baku", type: SubledgerType.VENDOR, opening: 18_000_000 },
    ],
    templates: [
      { name: "Arus Kas Bulanan", kind: "ARUS_KAS", description: "Pergerakan kas masuk & keluar per bulan" },
      { name: "Penjualan per Channel", kind: "PENJUALAN_PER_CHANNEL", description: "Omzet per kanal penjualan", groupBy: "channel" },
      { name: "Analisis Beban Operasional", kind: "BEBAN", description: "Rincian beban usaha per kategori" },
    ],
  },
  {
    name: "PT Nusantara Logistik",
    assets: [
      { name: "Truk Box 5 ton", category: "Kendaraan", cost: 400_000_000, lifeMonths: 96, fiscalGroup: "K2", purchase: "2023-11-10" },
      { name: "Truk Pickup 2 ton", category: "Kendaraan", cost: 250_000_000, lifeMonths: 96, fiscalGroup: "K2", purchase: "2024-02-20" },
      { name: "Peralatan Gudang", category: "Peralatan", cost: 45_000_000, lifeMonths: 48, fiscalGroup: "K1", purchase: "2024-09-01" },
    ],
    subledgers: [
      { code: "CT-001", name: "Pelanggan Logistik A", type: SubledgerType.CUSTOMER, opening: 120_000_000 },
      { code: "CT-002", name: "Pelanggan Logistik B", type: SubledgerType.CUSTOMER, opening: 65_000_000 },
      { code: "AP-001", name: "Supplier BBM", type: SubledgerType.VENDOR, opening: 35_000_000 },
    ],
    templates: [
      { name: "Arus Kas Bulanan", kind: "ARUS_KAS", description: "Pergerakan kas masuk & keluar per bulan" },
      { name: "Pendapatan per Proyek", kind: "PENDAPATAN_PER_PROYEK", description: "Pendapatan pengiriman per rute/proyek", groupBy: "project" },
      { name: "Beban per Channel", kind: "BEBAN_PER_CHANNEL", description: "Beban operasional per kanal", groupBy: "channel" },
    ],
  },
  {
    name: "UD Sumber Rejeki",
    assets: [
      { name: "Mesin Produksi", category: "Mesin", cost: 300_000_000, lifeMonths: 96, fiscalGroup: "K2", purchase: "2023-08-05" },
      { name: "Peralatan Pabrik", category: "Peralatan", cost: 50_000_000, lifeMonths: 48, fiscalGroup: "K1", purchase: "2024-04-15" },
    ],
    subledgers: [
      { code: "CT-001", name: "Pelanggan Distributor", type: SubledgerType.CUSTOMER, opening: 80_000_000 },
      { code: "AP-001", name: "Supplier Bahan Mentah", type: SubledgerType.VENDOR, opening: 40_000_000 },
    ],
    templates: [
      { name: "Arus Kas Bulanan", kind: "ARUS_KAS", description: "Pergerakan kas masuk & keluar per bulan" },
      { name: "Penjualan per Channel", kind: "PENJUALAN_PER_CHANNEL", description: "Omzet per kanal penjualan", groupBy: "channel" },
      { name: "Analisis Beban Produksi", kind: "BEBAN", description: "Rincian beban produksi per kategori" },
    ],
  },
];

async function main() {
  for (const s of SEEDS) {
    const client = await prisma.client.findFirst({ where: { name: s.name } });
    if (!client) {
      console.log(`⚠️ klien tidak ditemukan: ${s.name}`);
      continue;
    }

    // 1) Aset tetap (hapus lalu buat ulang agar idempotent)
    await prisma.depreciationSchedule.deleteMany({
      where: { asset: { clientId: client.id } },
    });
    await prisma.fixedAsset.deleteMany({ where: { clientId: client.id } });
    let assetCount = 0;
    for (const a of s.assets) {
      const asset = await prisma.fixedAsset.create({
        data: {
          firmId: client.firmId,
          clientId: client.id,
          name: a.name,
          category: a.category,
          purchaseDate: new Date(a.purchase),
          purchaseCost: a.cost,
          residualValue: 0,
          method: DepreciationMethod.STRAIGHT_LINE,
          commercialLifeMonths: a.lifeMonths,
          fiscalGroup: a.fiscalGroup,
          status: FixedAssetStatus.ACTIVE,
        },
      });
      const monthly = Math.floor(a.cost / a.lifeMonths);
      let acc = 0;
      for (let i = 0; i < PERIODS.length; i++) {
        acc += monthly;
        await prisma.depreciationSchedule.create({
          data: {
            assetId: asset.id,
            period: PERIODS[i],
            commercialAmount: monthly,
            fiscalAmount: monthly,
            accumulatedCommercial: acc,
            accumulatedFiscal: acc,
            bookValueCommercial: Math.max(0, a.cost - acc),
            bookValueFiscal: Math.max(0, a.cost - acc),
          },
        });
      }
      assetCount++;
    }
    console.log(`✅ ${s.name}: ${assetCount} aset + penyusutan Jan–Agu`);

    // 2) Subledger
    for (const sl of s.subledgers) {
      await prisma.subledger.upsert({
        where: { clientId_code: { clientId: client.id, code: sl.code } },
        create: {
          firmId: client.firmId,
          clientId: client.id,
          code: sl.code,
          name: sl.name,
          type: sl.type,
          openingBalance: sl.opening,
        },
        update: { name: sl.name, type: sl.type, openingBalance: sl.opening },
      });
    }
    console.log(`   ↳ ${s.subledgers.length} subledger`);

    // 3) Laporan custom AI (reportTemplates)
    const profile = await prisma.clientProfile.findUnique({ where: { clientId: client.id } });
    if (profile) {
      const current = (profile.reportTemplates ?? {}) as Record<string, unknown>;
      const now = new Date().toISOString();
      for (const t of s.templates) {
        const id = "tmpl_" + t.kind.toLowerCase().replace(/_/g, "") + "_" + client.id.slice(0, 4);
        current[id] = {
          id,
          name: t.name,
          kind: t.kind,
          description: t.description,
          dimensions: {},
          groupBy: t.groupBy ?? null,
          period: "2026-08",
          createdAt: now,
        };
      }
      await prisma.clientProfile.update({
        where: { clientId: client.id },
        data: { reportTemplates: current as unknown as import("@prisma/client").Prisma.InputJsonValue },
      });
    }
    console.log(`   ↳ ${s.templates.length} template laporan custom`);
  }
  console.log("Selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
