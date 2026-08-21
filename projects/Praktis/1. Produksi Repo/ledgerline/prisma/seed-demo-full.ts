/**
 * Seed — Data demo penuh untuk presentasi.
 *
 * 1) Memastikan 5 klien aktif (3 lama + 2 baru: PT Nusantara Logistik, UD Sumber Rejeki).
 * 2) Jurnal bulanan Januari–Agustus 2026 (penjualan/pendapatan + beban) utk SEMUA klien
 *    → "transaksi sudah berjalan dari Januari 2026".
 * 3) Histori 5 tahun (FY2021–FY2025) utk klien "PT Nusantara Logistik" → "sudah berjalan lima tahun".
 *
 * Idempotent: melewati klien/periode yang sudah punya data.
 * Jalankan: npx tsx prisma/seed-demo-full.ts
 */

import { PrismaClient, Industry, JournalStatus, JournalType } from "@prisma/client";

const prisma = new PrismaClient();
const JT = 1_000_000; // juta → rupiah

type L = { code: string; name: string; debit: number; credit: number };

function bal(lines: L[]) {
  const d = lines.reduce((s, l) => s + l.debit, 0);
  const c = lines.reduce((s, l) => s + l.credit, 0);
  if (d !== c) throw new Error(`tidak balance: D ${d} vs K ${c}`);
}

// ── Definisi 5 klien ──────────────────────────────────────────────────────────
const CLIENTS: Array<{ name: string; industry: Industry; taxId: string }> = [
  { name: "PT Maju Jaya", industry: Industry.RETAIL, taxId: "01.234.567.8-901.000" },
  { name: "CV Berkah Abadi", industry: Industry.SERVICES, taxId: "02.345.678.9-012.000" },
  { name: "PT Sentosa", industry: Industry.FNB, taxId: "03.456.789.0-123.000" },
  { name: "PT Nusantara Logistik", industry: Industry.TRANSPORT, taxId: "04.567.890.1-234.000" },
  { name: "UD Sumber Rejeki", industry: Industry.MANUFACTURING, taxId: "05.678.901.2-345.000" },
];

// Base revenue bulanan per klien (Januari 2026) — tumbuh ~8%/bulan.
const BASE_REVENUE: Record<string, number> = {
  "PT Maju Jaya": 210_000_000,
  "CV Berkah Abadi": 95_000_000,
  "PT Sentosa": 140_000_000,
  "PT Nusantara Logistik": 180_000_000,
  "UD Sumber Rejeki": 75_000_000,
};
const BASE_EXPENSE: Record<string, number> = {
  "PT Maju Jaya": 95_000_000,
  "CV Berkah Abadi": 45_000_000,
  "PT Sentosa": 70_000_000,
  "PT Nusantara Logistik": 85_000_000,
  "UD Sumber Rejeki": 38_000_000,
};

// ── Jurnal bulanan 2026 (Jan–Agu) ────────────────────────────────────────────
async function seedMonthly(firmId: string) {
  for (const def of CLIENTS) {
    const client = await prisma.client.findFirst({ where: { firmId, name: def.name } });
    if (!client) { console.log(`  ↪ skip ${def.name} (tidak ditemukan)`); continue; }
    const baseRev = BASE_REVENUE[def.name] ?? 100_000_000;
    const baseExp = BASE_EXPENSE[def.name] ?? 50_000_000;
    let created = 0, skipped = 0;

    for (let m = 0; m < 8; m++) { // Jan (0) .. Agu (7)
      const y = 2026, mo = m; // Januari = month 0
      const start = new Date(y, mo, 1);
      const end = new Date(y, mo + 1, 1);
      const existing = await prisma.journalEntry.findFirst({
        where: { clientId: client.id, entryDate: { gte: start, lt: end } },
      });
      if (existing) { skipped++; continue; }

      const growth = 1 + m * 0.08;
      const rev = Math.round((baseRev * growth) / 1000) * 1000;
      const ppn = Math.round((rev * 0.11) / 1000) * 1000;
      const gaji = Math.round((baseExp * 0.6 * growth) / 1000) * 1000;
      const sewa = Math.round((baseExp * 0.4 * growth) / 1000) * 1000;
      const day = 6 + m * 4; // tanggal transaksi tiap bulan

      // 1) Pendapatan (penjualan kredit / jasa) — balance
      const revLines: L[] = [
        { code: "1-1200", name: "Piutang Usaha", debit: rev + ppn, credit: 0 },
        { code: def.industry === Industry.SERVICES || def.industry === Industry.TRANSPORT ? "4-2000" : "4-1000", name: def.industry === Industry.SERVICES || def.industry === Industry.TRANSPORT ? "Pendapatan Jasa" : "Pendapatan Penjualan", debit: 0, credit: rev },
        { code: "2-2000", name: "PPN Keluaran", debit: 0, credit: ppn },
      ];
      bal(revLines);
      await prisma.journalEntry.create({
        data: {
          firmId, clientId: client.id, status: JournalStatus.APPROVED, confidence: 0.97,
          description: `Penjualan ${def.name} — ${monthLabel(mo)} 2026`,
          createdByAi: true, journalType: JournalType.AI,
          entryDate: new Date(y, mo, day, 10, 0, 0),
          createdAt: new Date(y, mo, day, 10, 5, 0),
          lines: { create: revLines.map((l) => ({ accountCode: l.code, accountName: l.name, debit: l.debit, credit: l.credit, notes: "Seed demo bulanan" })) },
        },
      });

      // 2) Beban operasional (gaji + sewa) — balance
      const expLines: L[] = [
        { code: "5-1000", name: "Beban Gaji", debit: gaji, credit: 0 },
        { code: "5-2000", name: "Beban Sewa", debit: sewa, credit: 0 },
        { code: "1-1000", name: "Kas", debit: 0, credit: gaji + sewa },
      ];
      bal(expLines);
      await prisma.journalEntry.create({
        data: {
          firmId, clientId: client.id, status: JournalStatus.APPROVED, confidence: 0.98,
          description: `Beban operasional ${def.name} — ${monthLabel(mo)} 2026`,
          createdByAi: true, journalType: JournalType.AI,
          entryDate: new Date(y, mo, day + 2, 10, 0, 0),
          createdAt: new Date(y, mo, day + 2, 10, 5, 0),
          lines: { create: expLines.map((l) => ({ accountCode: l.code, accountName: l.name, debit: l.debit, credit: l.credit, notes: "Seed demo bulanan" })) },
        },
      });
      created++;
    }
    console.log(`  ✅ ${def.name}: ${created} bulan dibuat (${skipped} sudah ada)`);
  }
}

function monthLabel(m: number) {
  return ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus"][m];
}

// ── Histori 5 tahun (FY2021–FY2025) utk PT Nusantara Logistik ────────────────
const NUSANTARA_YEARS: Array<{ year: number; rev: number; hpp: number; opex: number; cash: number; ar: number; inventory: number; fixed: number; accum: number; ap: number; modal: number }> = [
  { year: 2021, rev: 900, hpp: 630, opex: 170, cash: 300, ar: 150, inventory: 60, fixed: 800, accum: 100, ap: 200, modal: 500 },
  { year: 2022, rev: 1_050, hpp: 735, opex: 195, cash: 360, ar: 180, inventory: 75, fixed: 900, accum: 180, ap: 240, modal: 500 },
  { year: 2023, rev: 1_250, hpp: 875, opex: 225, cash: 440, ar: 215, inventory: 90, fixed: 1_050, accum: 270, ap: 290, modal: 600 },
  { year: 2024, rev: 1_520, hpp: 1_064, opex: 260, cash: 540, ar: 260, inventory: 110, fixed: 1_250, accum: 370, ap: 350, modal: 600 },
  { year: 2025, rev: 1_860, hpp: 1_302, opex: 300, cash: 660, ar: 315, inventory: 135, fixed: 1_500, accum: 480, ap: 420, modal: 700 },
];

async function seedFiveYears(firmId: string) {
  const client = await prisma.client.findFirst({ where: { firmId, name: "PT Nusantara Logistik" } });
  if (!client) { console.log("  ↪ skip Nusantara 5 tahun (tidak ditemukan)"); return; }
  let created = 0, skipped = 0;
  for (const yr of NUSANTARA_YEARS) {
    const entryDate = new Date(yr.year, 11, 31, 12, 0, 0); // 31 Desember
    const existing = await prisma.journalEntry.findFirst({
      where: { clientId: client.id, entryDate: { gte: new Date(yr.year, 11, 1), lt: new Date(yr.year + 1, 0, 1) } },
    });
    if (existing) { skipped++; continue; }

    // Laba ditahan = penyeimbang (plug) agar total debit = total kredit.
    const retained =
      yr.cash + yr.ar + yr.inventory + yr.fixed + yr.hpp + yr.opex -
      (yr.accum + yr.ap + yr.modal + yr.rev);
    const lines: L[] = [
      { code: "1-1000", name: "Kas", debit: yr.cash * JT, credit: 0 },
      { code: "1-1200", name: "Piutang Usaha", debit: yr.ar * JT, credit: 0 },
      { code: "1-1300", name: "Persediaan", debit: yr.inventory * JT, credit: 0 },
      { code: "1-1500", name: "Aset Tetap", debit: yr.fixed * JT, credit: 0 },
      { code: "1-1600", name: "Akumulasi Penyusutan", debit: 0, credit: yr.accum * JT },
      { code: "2-1100", name: "Utang Usaha", debit: 0, credit: yr.ap * JT },
      { code: "3-1000", name: "Modal", debit: 0, credit: yr.modal * JT },
      { code: "3-2000", name: "Laba Ditahan", debit: 0, credit: retained * JT },
      { code: "4-2000", name: "Pendapatan Jasa", debit: 0, credit: yr.rev * JT },
      { code: "5-5000", name: "HPP", debit: yr.hpp * JT, credit: 0 },
      { code: "5-3000", name: "Beban Operasional", debit: yr.opex * JT, credit: 0 },
    ];
    bal(lines);
    await prisma.journalEntry.create({
      data: {
        firmId, clientId: client.id, status: JournalStatus.FINALIZED, confidence: 0.99,
        description: `Ringkasan aktivitas FY${yr.year} — PT Nusantara Logistik`,
        createdByAi: true, journalType: JournalType.AI,
        entryDate, createdAt: entryDate,
        lines: { create: lines.map((l) => ({ accountCode: l.code, accountName: l.name, debit: l.debit, credit: l.credit, notes: "Seed demo 5 tahun" })) },
      },
    });
    created++;
  }
  console.log(`  ✅ PT Nusantara Logistik: ${created} tahun histori dibuat (${skipped} sudah ada)`);
}

async function main() {
  const firm = await prisma.firm.findFirst();
  if (!firm) { console.log("✗ Tidak ada firma — jalankan seed utama dulu."); return; }
  console.log(`Seeding demo penuh untuk firma ${firm.name}…`);

  // 1) Tambah klien baru yang belum ada
  for (const def of CLIENTS) {
    const exists = await prisma.client.findFirst({ where: { firmId: firm.id, name: def.name } });
    if (!exists) {
      await prisma.client.create({ data: { firmId: firm.id, name: def.name, industry: def.industry, taxId: def.taxId } });
      console.log(`  ➕ klien baru: ${def.name}`);
    }
  }

  // 2) Jurnal bulanan 2026
  console.log("📒 Jurnal bulanan 2026 (Jan–Agu)…");
  await seedMonthly(firm.id);

  // 3) Histori 5 tahun
  console.log("🗓️ Histori 5 tahun (FY2021–FY2025)…");
  await seedFiveYears(firm.id);

  const total = await prisma.client.count({ where: { firmId: firm.id } });
  const journals = await prisma.journalEntry.count({ where: { firmId: firm.id } });
  console.log(`✅ Selesai. Total klien: ${total}, total jurnal: ${journals}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
