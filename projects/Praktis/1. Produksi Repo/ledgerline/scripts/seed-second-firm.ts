/**
 * Seed firma kedua — membuktikan skeleton multi-tenant (2 firma, data terisolasi).
 *
 * Membuat: Firm "PT Mitra Akuntan Nusantara" + 2 user akuntan + 2 klien
 * (ClientProfile: READY + LEARNING) + 1 jurnal manual (APPROVED) + ActivityLog.
 *
 * Idempotent — aman dijalankan berulang (update existing, bukan duplikat).
 * Jalankan: npx tsx scripts/seed-second-firm.ts
 *
 * REVERT (hapus firma kedua beserta datanya, urut karena relasi Restrict):
 *   npx tsx -e "
 *     import { PrismaClient } from '@prisma/client';
 *     const p = new PrismaClient();
 *     (async () => {
 *       const f = await p.firm.findUnique({ where: { slug: 'mitra-akuntan' } });
 *       if (!f) return console.log('firma kedua tidak ada');
 *       const clients = await p.client.findMany({ where: { firmId: f.id } });
 *       for (const c of clients) {
 *         await p.clientProfile.deleteMany({ where: { clientId: c.id } });
 *         await p.clientPortalToken.deleteMany({ where: { clientId: c.id } });
 *         await p.journalLine.deleteMany({ where: { journalEntry: { clientId: c.id } } });
 *         await p.journalEntry.deleteMany({ where: { clientId: c.id } });
 *         await p.document.deleteMany({ where: { clientId: c.id } });
 *         await p.slaEvent.deleteMany({ where: { firmId: f.id } });
 *         await p.client.delete({ where: { id: c.id } });
 *       }
 *       await p.activityLog.deleteMany({ where: { firmId: f.id } });
 *       await p.outboxEvent.deleteMany({ where: { firmId: f.id } });
 *       await p.webhookSubscription.deleteMany({ where: { firmId: f.id } });
 *       await p.user.deleteMany({ where: { firmId: f.id } });
 *       await p.firm.delete({ where: { id: f.id } });
 *       console.log('firma kedua dihapus');
 *     })();
 *   "
 */
import { PrismaClient, ProfileStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD_HASH = bcrypt.hashSync("password123", 10);

async function main() {
  const slug = "mitra-akuntan";
  const existing = await prisma.firm.findUnique({ where: { slug } });

  const firm = existing
    ? existing
    : await prisma.firm.create({ data: { name: "PT Mitra Akuntan Nusantara", slug } });
  console.log(`🏢 Firm: ${firm.name} (${existing ? "sudah ada — update" : "baru"})`);

  // ── Users (akuntan milik firma kedua) ─────────────────────────────
  const users = [
    { email: "admin.mitra@demo.dev", name: "Admin Mitra", role: "ADMIN" as const },
    { email: "senior.mitra@demo.dev", name: "Senior Mitra", role: "SENIOR" as const },
  ];
  for (const u of users) {
    const exists = await prisma.user.findUnique({ where: { firmId_email: { firmId: firm.id, email: u.email } } });
    if (exists) {
      await prisma.user.update({ where: { id: exists.id }, data: { name: u.name, role: u.role, active: true } });
      console.log(`  ↪ user ${u.email} — update`);
    } else {
      await prisma.user.create({ data: { firmId: firm.id, email: u.email, name: u.name, role: u.role, passwordHash: PASSWORD_HASH } });
      console.log(`  ✅ user ${u.email} (${u.role})`);
    }
  }

  // ── Klien firma kedua ─────────────────────────────────────────────
  const sejahtera = await upsertClient(firm.id, "PT Sejahtera Bersama", "FNB");
  const karya = await upsertClient(firm.id, "CV Karya Mandiri", "SERVICES");
  console.log(`  ✅ klien: ${sejahtera.name}, ${karya.name}`);

  // ── ClientProfile ─────────────────────────────────────────────────
  const sejahteraProfile = await prisma.clientProfile.upsert({
    where: { clientId: sejahtera.id },
    update: {
      firmId: firm.id,
      coaMapping: {
        "1000": { accountCode: "1-1100", accountName: "Kas dan Setara Kas" },
        "4100": { accountCode: "4-1000", accountName: "Pendapatan Penjualan" },
        "5100": { accountCode: "5-1000", accountName: "Harga Pokok Penjualan" },
        "6100": { accountCode: "6-1100", accountName: "Beban Operasional" },
      },
      mappingStatus: ProfileStatus.READY,
      sourcePeriod: "2026-07",
    },
    create: {
      clientId: sejahtera.id,
      firmId: firm.id,
      coaMapping: {
        "1000": { accountCode: "1-1100", accountName: "Kas dan Setara Kas" },
        "4100": { accountCode: "4-1000", accountName: "Pendapatan Penjualan" },
        "5100": { accountCode: "5-1000", accountName: "Harga Pokok Penjualan" },
        "6100": { accountCode: "6-1100", accountName: "Beban Operasional" },
      },
      mappingStatus: ProfileStatus.READY,
      sourcePeriod: "2026-07",
    },
  });
  console.log(`  ✅ profil ${sejahtera.name}: ${sejahteraProfile.mappingStatus} (4 akun COA)`);

  const karyaProfile = await prisma.clientProfile.upsert({
    where: { clientId: karya.id },
    update: { firmId: firm.id, mappingStatus: ProfileStatus.LEARNING },
    create: { clientId: karya.id, firmId: firm.id, mappingStatus: ProfileStatus.LEARNING },
  });
  console.log(`  ✅ profil ${karya.name}: ${karyaProfile.mappingStatus}`);

  // ── 1 jurnal manual milik firma kedua (bukti isolasi) ─────────────
  const manualCount = await prisma.journalEntry.count({ where: { firmId: firm.id, journalType: "MANUAL" } });
  if (manualCount === 0) {
    await prisma.journalEntry.create({
      data: {
        firmId: firm.id,
        clientId: sejahtera.id,
        description: "Jurnal manual firma kedua — setoran modal",
        status: "APPROVED",
        createdByAi: false,
        journalType: "MANUAL",
        entryDate: new Date("2026-08-10"),
        lines: {
          create: [
            { accountCode: "1-1100", accountName: "Kas dan Setara Kas", debit: 50_000_000 },
            { accountCode: "4-1000", accountName: "Pendapatan Penjualan", credit: 50_000_000 },
          ],
        },
        activities: {
          create: {
            firmId: firm.id,
            userId: (await prisma.user.findUnique({ where: { firmId_email: { firmId: firm.id, email: "admin.mitra@demo.dev" } } }))?.id ?? null,
            action: "JOURNAL_CREATED",
            detail: { journalType: "MANUAL", source: "manual", note: "seed firma kedua" },
          },
        },
      },
    });
    console.log("  ✅ jurnal manual firma kedua (setoran modal 50jt)");
  } else {
    console.log(`  ↪ jurnal manual sudah ada (${manualCount}) — skip`);
  }

  console.log(`\nLogin firma kedua: admin.mitra@demo.dev / password123 (ADMIN)`);
  console.log(`                  senior.mitra@demo.dev / password123 (SENIOR)`);
}

async function upsertClient(firmId: string, name: string, industry: "RETAIL" | "SERVICES" | "FNB") {
  const existing = await prisma.client.findFirst({ where: { firmId, name } });
  if (existing) return existing;
  return prisma.client.create({
    data: { firmId, name, industry, status: "ACTIVE" },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
