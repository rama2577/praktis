/**
 * Seed — Demo Data Historis Multi-Period (Ikhtisar Keuangan).
 *
 * Mengisi journal entries ringkas untuk periode historis (FY2022–FY2025,
 * bulan yang sama dengan periode aktif: 2026-08 → 2022-08..2025-08) untuk
 * klien demo, sehingga tab Ikhtisar & trend chart menampilkan 5 periode
 * dengan pertumbuhan realistis.
 *
 * Idempotent: melewati klien/periode yang sudah punya data.
 *
 * Jalankan: npx tsx scripts/seed-multi-period.ts
 */

import { PrismaClient, JournalStatus, JournalType } from "@prisma/client";

const prisma = new PrismaClient();
const JUTA = 1_000_000;

type Line = { code: string; name: string; debit: number; credit: number };
type PeriodData = {
  period: string; // "YYYY-MM"
  day: number;
  desc: string;
  lines: Line[];
};

// ── Data CV Berkah Abadi (distribusi, growth ~20%/tahun) ─────────────────────
// Angka dalam rupiah penuh. Jurnal ringkas: 1) aktivitas usaha, 2) pembayaran beban.
const BERKAH: PeriodData[] = [
  {
    period: "2022-08", day: 15, desc: "Ringkasan aktivitas FY2022 (YTD)",
    lines: [
      { code: "1101", name: "Kas", debit: 800_000_000, credit: 0 },
      { code: "1201", name: "Piutang Usaha", debit: 350_000_000, credit: 0 },
      { code: "1301", name: "Persediaan", debit: 420_000_000, credit: 0 },
      { code: "1401", name: "Aset Tetap", debit: 1_500_000_000, credit: 0 },
      { code: "1402", name: "Akumulasi Penyusutan", debit: 0, credit: 300_000_000 },
      { code: "2101", name: "Utang Usaha", debit: 0, credit: 300_000_000 },
      { code: "2201", name: "Utang Pajak", debit: 0, credit: 60_000_000 },
      { code: "3101", name: "Modal", debit: 0, credit: 1_500_000_000 },
      { code: "3201", name: "Laba Ditahan", debit: 0, credit: 430_000_000 },
      { code: "4101", name: "Pendapatan Penjualan", debit: 0, credit: 2_400_000_000 },
      { code: "5101", name: "HPP", debit: 1_680_000_000, credit: 0 },
      { code: "5201", name: "Beban Gaji", debit: 240_000_000, credit: 0 },
      { code: "5202", name: "Beban Sewa", debit: 120_000_000, credit: 0 },
      { code: "5203", name: "Beban Operasional Lain", debit: 60_000_000, credit: 0 },
      { code: "5204", name: "Beban Pajak", debit: 60_000_000, credit: 0 },
      { code: "3301", name: "Laba Berjalan", debit: 0, credit: 240000000 },
    ],
  },
  {
    period: "2023-08", day: 15, desc: "Ringkasan aktivitas FY2023 (YTD)",
    lines: [
      { code: "1101", name: "Kas", debit: 1_184_000_000, credit: 0 },
      { code: "1201", name: "Piutang Usaha", debit: 420_000_000, credit: 0 },
      { code: "1301", name: "Persediaan", debit: 500_000_000, credit: 0 },
      { code: "1401", name: "Aset Tetap", debit: 1_650_000_000, credit: 0 },
      { code: "1402", name: "Akumulasi Penyusutan", debit: 0, credit: 450_000_000 },
      { code: "2101", name: "Utang Usaha", debit: 0, credit: 360_000_000 },
      { code: "2201", name: "Utang Pajak", debit: 0, credit: 78_000_000 },
      { code: "3101", name: "Modal", debit: 0, credit: 1_500_000_000 },
      { code: "3201", name: "Laba Ditahan", debit: 0, credit: 742_000_000 },
      { code: "4101", name: "Pendapatan Penjualan", debit: 0, credit: 2_900_000_000 },
      { code: "5101", name: "HPP", debit: 2_030_000_000, credit: 0 },
      { code: "5201", name: "Beban Gaji", debit: 280_000_000, credit: 0 },
      { code: "5202", name: "Beban Sewa", debit: 135_000_000, credit: 0 },
      { code: "5203", name: "Beban Operasional Lain", debit: 65_000_000, credit: 0 },
      { code: "5204", name: "Beban Pajak", debit: 78_000_000, credit: 0 },
      { code: "3301", name: "Laba Berjalan", debit: 0, credit: 312000000 },
    ],
  },
  {
    period: "2024-08", day: 15, desc: "Ringkasan aktivitas FY2024 (YTD)",
    lines: [
      { code: "1101", name: "Kas", debit: 1_666_000_000, credit: 0 },
      { code: "1201", name: "Piutang Usaha", debit: 500_000_000, credit: 0 },
      { code: "1301", name: "Persediaan", debit: 600_000_000, credit: 0 },
      { code: "1401", name: "Aset Tetap", debit: 1_800_000_000, credit: 0 },
      { code: "1402", name: "Akumulasi Penyusutan", debit: 0, credit: 620_000_000 },
      { code: "2101", name: "Utang Usaha", debit: 0, credit: 430_000_000 },
      { code: "2201", name: "Utang Pajak", debit: 0, credit: 98_000_000 },
      { code: "3101", name: "Modal", debit: 0, credit: 1_500_000_000 },
      { code: "3201", name: "Laba Ditahan", debit: 0, credit: 1_134_000_000 },
      { code: "4101", name: "Pendapatan Penjualan", debit: 0, credit: 3_500_000_000 },
      { code: "5101", name: "HPP", debit: 2_450_000_000, credit: 0 },
      { code: "5201", name: "Beban Gaji", debit: 330_000_000, credit: 0 },
      { code: "5202", name: "Beban Sewa", debit: 150_000_000, credit: 0 },
      { code: "5203", name: "Beban Operasional Lain", debit: 80_000_000, credit: 0 },
      { code: "5204", name: "Beban Pajak", debit: 98_000_000, credit: 0 },
      { code: "3301", name: "Laba Berjalan", debit: 0, credit: 392000000 },
    ],
  },
  {
    period: "2025-08", day: 15, desc: "Ringkasan aktivitas FY2025 (YTD)",
    lines: [
      { code: "1101", name: "Kas", debit: 2_270_000_000, credit: 0 },
      { code: "1201", name: "Piutang Usaha", debit: 600_000_000, credit: 0 },
      { code: "1301", name: "Persediaan", debit: 700_000_000, credit: 0 },
      { code: "1401", name: "Aset Tetap", debit: 1_950_000_000, credit: 0 },
      { code: "1402", name: "Akumulasi Penyusutan", debit: 0, credit: 800_000_000 },
      { code: "2101", name: "Utang Usaha", debit: 0, credit: 500_000_000 },
      { code: "2201", name: "Utang Pajak", debit: 0, credit: 122_000_000 },
      { code: "3101", name: "Modal", debit: 0, credit: 1_500_000_000 },
      { code: "3201", name: "Laba Ditahan", debit: 0, credit: 1_622_000_000 },
      { code: "4101", name: "Pendapatan Penjualan", debit: 0, credit: 4_200_000_000 },
      { code: "5101", name: "HPP", debit: 2_940_000_000, credit: 0 },
      { code: "5201", name: "Beban Gaji", debit: 380_000_000, credit: 0 },
      { code: "5202", name: "Beban Sewa", debit: 165_000_000, credit: 0 },
      { code: "5203", name: "Beban Operasional Lain", debit: 105_000_000, credit: 0 },
      { code: "5204", name: "Beban Pajak", debit: 122_000_000, credit: 0 },
      { code: "3301", name: "Laba Berjalan", debit: 0, credit: 488000000 },
    ],
  },
];

// ── Data PT Maju Jaya (manufaktur kecil, skala ~1.3x Berkah) ─────────────────
const MAJU: PeriodData[] = [
  {
    period: "2022-08", day: 15, desc: "Ringkasan aktivitas FY2022 (YTD)",
    lines: [
      { code: "1101", name: "Kas", debit: 690_000_000, credit: 0 },
      { code: "1201", name: "Piutang Usaha", debit: 480_000_000, credit: 0 },
      { code: "1301", name: "Persediaan Bahan Baku", debit: 550_000_000, credit: 0 },
      { code: "1401", name: "Aset Tetap", debit: 2_400_000_000, credit: 0 },
      { code: "1402", name: "Akumulasi Penyusutan", debit: 0, credit: 500_000_000 },
      { code: "2101", name: "Utang Usaha", debit: 0, credit: 420_000_000 },
      { code: "2201", name: "Utang Pajak", debit: 0, credit: 90_000_000 },
      { code: "3101", name: "Modal", debit: 0, credit: 2_000_000_000 },
      { code: "3201", name: "Laba Ditahan", debit: 0, credit: 690_000_000 },
      { code: "4101", name: "Pendapatan Penjualan", debit: 0, credit: 3_200_000_000 },
      { code: "5101", name: "HPP", debit: 2_240_000_000, credit: 0 },
      { code: "5201", name: "Beban Gaji", debit: 380_000_000, credit: 0 },
      { code: "5202", name: "Beban Sewa", debit: 180_000_000, credit: 0 },
      { code: "5203", name: "Beban Operasional Lain", debit: 100_000_000, credit: 0 },
      { code: "5204", name: "Beban Pajak", debit: 90_000_000, credit: 0 },
      { code: "3301", name: "Laba Berjalan", debit: 0, credit: 210000000 },
    ],
  },
  {
    period: "2023-08", day: 15, desc: "Ringkasan aktivitas FY2023 (YTD)",
    lines: [
      { code: "1101", name: "Kas", debit: 1_240_000_000, credit: 0 },
      { code: "1201", name: "Piutang Usaha", debit: 580_000_000, credit: 0 },
      { code: "1301", name: "Persediaan Bahan Baku", debit: 660_000_000, credit: 0 },
      { code: "1401", name: "Aset Tetap", debit: 2_650_000_000, credit: 0 },
      { code: "1402", name: "Akumulasi Penyusutan", debit: 0, credit: 700_000_000 },
      { code: "2101", name: "Utang Usaha", debit: 0, credit: 510_000_000 },
      { code: "2201", name: "Utang Pajak", debit: 0, credit: 112_000_000 },
      { code: "3101", name: "Modal", debit: 0, credit: 2_000_000_000 },
      { code: "3201", name: "Laba Ditahan", debit: 0, credit: 1_208_000_000 },
      { code: "4101", name: "Pendapatan Penjualan", debit: 0, credit: 3_900_000_000 },
      { code: "5101", name: "HPP", debit: 2_730_000_000, credit: 0 },
      { code: "5201", name: "Beban Gaji", debit: 440_000_000, credit: 0 },
      { code: "5202", name: "Beban Sewa", debit: 200_000_000, credit: 0 },
      { code: "5203", name: "Beban Operasional Lain", debit: 118_000_000, credit: 0 },
      { code: "5204", name: "Beban Pajak", debit: 112_000_000, credit: 0 },
      { code: "3301", name: "Laba Berjalan", debit: 0, credit: 300000000 },
    ],
  },
  {
    period: "2024-08", day: 15, desc: "Ringkasan aktivitas FY2024 (YTD)",
    lines: [
      { code: "1101", name: "Kas", debit: 1_840_000_000, credit: 0 },
      { code: "1201", name: "Piutang Usaha", debit: 700_000_000, credit: 0 },
      { code: "1301", name: "Persediaan Bahan Baku", debit: 800_000_000, credit: 0 },
      { code: "1401", name: "Aset Tetap", debit: 2_900_000_000, credit: 0 },
      { code: "1402", name: "Akumulasi Penyusutan", debit: 0, credit: 900_000_000 },
      { code: "2101", name: "Utang Usaha", debit: 0, credit: 610_000_000 },
      { code: "2201", name: "Utang Pajak", debit: 0, credit: 140_000_000 },
      { code: "3101", name: "Modal", debit: 0, credit: 2_000_000_000 },
      { code: "3201", name: "Laba Ditahan", debit: 0, credit: 1_790_000_000 },
      { code: "4101", name: "Pendapatan Penjualan", debit: 0, credit: 4_700_000_000 },
      { code: "5101", name: "HPP", debit: 3_290_000_000, credit: 0 },
      { code: "5201", name: "Beban Gaji", debit: 510_000_000, credit: 0 },
      { code: "5202", name: "Beban Sewa", debit: 220_000_000, credit: 0 },
      { code: "5203", name: "Beban Operasional Lain", debit: 140_000_000, credit: 0 },
      { code: "5204", name: "Beban Pajak", debit: 140_000_000, credit: 0 },
      { code: "3301", name: "Laba Berjalan", debit: 0, credit: 400000000 },
    ],
  },
  {
    period: "2025-08", day: 15, desc: "Ringkasan aktivitas FY2025 (YTD)",
    lines: [
      { code: "1101", name: "Kas", debit: 2_590_000_000, credit: 0 },
      { code: "1201", name: "Piutang Usaha", debit: 820_000_000, credit: 0 },
      { code: "1301", name: "Persediaan Bahan Baku", debit: 940_000_000, credit: 0 },
      { code: "1401", name: "Aset Tetap", debit: 3_150_000_000, credit: 0 },
      { code: "1402", name: "Akumulasi Penyusutan", debit: 0, credit: 1_100_000_000 },
      { code: "2101", name: "Utang Usaha", debit: 0, credit: 710_000_000 },
      { code: "2201", name: "Utang Pajak", debit: 0, credit: 170_000_000 },
      { code: "3101", name: "Modal", debit: 0, credit: 2_000_000_000 },
      { code: "3201", name: "Laba Ditahan", debit: 0, credit: 2_480_000_000 },
      { code: "4101", name: "Pendapatan Penjualan", debit: 0, credit: 5_600_000_000 },
      { code: "5101", name: "HPP", debit: 3_920_000_000, credit: 0 },
      { code: "5201", name: "Beban Gaji", debit: 590_000_000, credit: 0 },
      { code: "5202", name: "Beban Sewa", debit: 240_000_000, credit: 0 },
      { code: "5203", name: "Beban Operasional Lain", debit: 160_000_000, credit: 0 },
      { code: "5204", name: "Beban Pajak", debit: 170_000_000, credit: 0 },
      { code: "3301", name: "Laba Berjalan", debit: 0, credit: 520000000 },
    ],
  },
];

async function seedClient(clientName: string, firmId: string, data: PeriodData[]) {
  const client = await prisma.client.findFirst({ where: { name: clientName, firmId } });
  if (!client) {
    console.log(`  ↪ skip ${clientName} (tidak ditemukan)`);
    return;
  }
  let created = 0;
  let skipped = 0;
  for (const p of data) {
    const [y, m] = p.period.split("-").map(Number);
    const start = new Date(y!, (m ?? 1) - 1, 1);
    const end = new Date(y!, (m ?? 1) - 1 + 1, 1);
    const existing = await prisma.journalEntry.findFirst({
      where: { clientId: client.id, entryDate: { gte: start, lt: end } },
    });
    if (existing) {
      skipped++;
      continue;
    }
    const totalDebit = p.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = p.lines.reduce((s, l) => s + l.credit, 0);
    if (totalDebit !== totalCredit) {
      throw new Error(`${clientName} ${p.period}: tidak balance (D ${totalDebit} vs K ${totalCredit})`);
    }
    await prisma.journalEntry.create({
      data: {
        firmId,
        clientId: client.id,
        status: "APPROVED",
        confidence: 0.99,
        description: p.desc,
        createdByAi: true,
        journalType: "AI",
        entryDate: new Date(y!, (m ?? 1) - 1, p.day, 10, 0, 0),
        lines: {
          create: p.lines.map((l) => ({
            accountCode: l.code,
            accountName: l.name,
            debit: l.debit,
            credit: l.credit,
            notes: "Seed demo multi-periode",
          })),
        },
      },
    });
    created++;
  }
  console.log(`  ✅ ${clientName}: ${created} periode dibuat, ${skipped} sudah ada`);
}

async function main() {
  const firm = await prisma.firm.findFirst();
  if (!firm) {
    console.log("✗ Tidak ada firma — jalankan seed utama dulu (npx prisma db seed)");
    return;
  }
  console.log(`Seeding multi-period untuk firma ${firm.name}…`);
  await seedClient("CV Berkah Abadi", firm.id, BERKAH);
  await seedClient("PT Maju Jaya", firm.id, MAJU);
  console.log("Selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
