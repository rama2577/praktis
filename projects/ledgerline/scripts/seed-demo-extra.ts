/**
 * Seed data demo tambahan — mengisi area yang kosong untuk demo lengkap:
 *   1. ClientProfile (profil klien: COA mapping, template laporan, aturan)
 *   2. OutboxEvent (riwayat notifikasi: journalApproved, slaBreach, reportReady)
 *   3. WebhookSubscription (contoh endpoint klien)
 *   4. NotificationLog (riwayat pengiriman untuk event PROCESSED)
 *
 * Idempotent — aman dijalankan berulang (juga setelah re-seed).
 * Jalankan: npx tsx scripts/seed-demo-extra.ts
 */
import { PrismaClient, ProfileStatus } from "@prisma/client";

const prisma = new PrismaClient();

const NOW = new Date();
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

async function main() {
  const firm = await prisma.firm.findFirst();
  if (!firm) throw new Error("Firm belum ada — jalankan `npx prisma db seed` dulu.");
  console.log(`🏢 Firm: ${firm.name}`);

  const clients = await prisma.client.findMany({ where: { firmId: firm.id } });
  const byName = (n: string) => clients.find((c) => c.name === n);
  const maju = byName("PT Maju Jaya");
  const berkah = byName("CV Berkah Abadi");
  const sentosa = byName("PT Sentosa");
  if (!maju || !berkah || !sentosa) throw new Error("Klien demo belum lengkap.");

  // ── 1. ClientProfile ──────────────────────────────────────────────
  console.log("👤 ClientProfile...");
  const profileDefs: Array<{
    client: typeof maju;
    mappingStatus: ProfileStatus;
    sourcePeriod: string;
    coaMapping: Record<string, { accountCode: string; accountName: string; note?: string }>;
    reportTemplates: Record<string, unknown>;
    rules: Record<string, unknown>;
  }> = [
    {
      client: maju,
      mappingStatus: ProfileStatus.READY,
      sourcePeriod: "2026-07",
      coaMapping: {
        "1000": { accountCode: "1-1100", accountName: "Kas dan Setara Kas" },
        "1100": { accountCode: "1-1200", accountName: "Piutang Usaha" },
        "2100": { accountCode: "2-2000", accountName: "PPN Keluaran" },
        "4100": { accountCode: "4-1000", accountName: "Pendapatan Penjualan" },
        "4110": { accountCode: "4-1010", accountName: "Pendapatan Jasa" },
        "5100": { accountCode: "5-1000", accountName: "Harga Pokok Penjualan" },
      },
      reportTemplates: {
        "laba-rugi": { title: "Laporan Laba Rugi", basis: "akrual", rows: ["pendapatan", "hpp", "beban-operasional"] },
        "neraca": { title: "Neraca", basis: "akrual", rows: ["aset", "liabilitas", "ekuitas"] },
      },
      rules: {
        ppn: 0.11,
        pembulatan: "rupiah",
        kategoriDefault: "RETAIL",
        piutangDefault: "1-1200",
        pendapatanDefault: "4-1000",
      },
    },
    {
      client: berkah,
      mappingStatus: ProfileStatus.READY,
      sourcePeriod: "2026-07",
      coaMapping: {
        "1000": { accountCode: "1-1100", accountName: "Kas dan Setara Kas" },
        "1200": { accountCode: "1-1200", accountName: "Piutang Usaha" },
        "2100": { accountCode: "2-2000", accountName: "PPN Keluaran" },
        "4100": { accountCode: "4-1010", accountName: "Pendapatan Jasa" },
        "5100": { accountCode: "5-1000", accountName: "Harga Pokok Penjualan" },
      },
      reportTemplates: {
        "laba-rugi": { title: "Laporan Laba Rugi", basis: "akrual", rows: ["pendapatan-jasa", "beban-langsung", "beban-operasional"] },
      },
      rules: {
        ppn: 0.11,
        pembulatan: "rupiah",
        kategoriDefault: "SERVICES",
        piutangDefault: "1-1200",
        pendapatanDefault: "4-1010",
      },
    },
    {
      client: sentosa,
      mappingStatus: ProfileStatus.LEARNING,
      sourcePeriod: "2026-07",
      coaMapping: {
        "1000": { accountCode: "1-1100", accountName: "Kas dan Setara Kas" },
        "4100": { accountCode: "4-1000", accountName: "Pendapatan Penjualan" },
      },
      reportTemplates: { "laba-rugi": { title: "Laporan Laba Rugi", basis: "akrual", rows: ["pendapatan", "hpp", "beban"] } },
      rules: {
        ppn: 0.11,
        kategoriDefault: "FNB",
        catatan: "Mapping masih dipelajari — butuh review partner",
      },
    },
  ];

  for (const d of profileDefs) {
    const existing = await prisma.clientProfile.findUnique({ where: { clientId: d.client.id } });
    if (existing) {
      await prisma.clientProfile.update({
        where: { clientId: d.client.id },
        data: {
          coaMapping: d.coaMapping,
          reportTemplates: d.reportTemplates,
          rules: d.rules,
          mappingStatus: d.mappingStatus,
          sourcePeriod: d.sourcePeriod,
        },
      });
      console.log(`  ↪ update ${d.client.name} — ${d.mappingStatus} (format mapping diperbaiki)`);
      continue;
    }
    await prisma.clientProfile.create({
      data: {
        clientId: d.client.id,
        firmId: firm.id,
        coaMapping: d.coaMapping,
        reportTemplates: d.reportTemplates,
        rules: d.rules,
        mappingStatus: d.mappingStatus,
        sourcePeriod: d.sourcePeriod,
      },
    });
    console.log(`  ✅ ${d.client.name} — ${d.mappingStatus}`);
  }

  // ── 2. WebhookSubscription ────────────────────────────────────────
  console.log("🔗 WebhookSubscription...");
  const webhookDefs = [
    {
      firmId: firm.id,
      url: "https://hook.majujaya.id/praktis",
      secret: "whsec_demo_majujaya",
      eventTypes: ["journalApproved", "journalException", "slaBreach"],
      enabled: true,
    },
    {
      firmId: firm.id,
      url: "https://api.berkahabadi.co.id/webhook/praktis",
      secret: "whsec_demo_berkah",
      eventTypes: ["reportReady", "journalException"],
      enabled: true,
    },
  ];
  for (const w of webhookDefs) {
    const existing = await prisma.webhookSubscription.findFirst({ where: { url: w.url } });
    if (existing) {
      console.log(`  ↪ skip ${w.url}`);
      continue;
    }
    await prisma.webhookSubscription.create({ data: w });
    console.log(`  ✅ ${w.url}`);
  }

  // ── 3. OutboxEvent + NotificationLog ──────────────────────────────
  console.log("📤 OutboxEvent...");
  const hasOutbox = await prisma.outboxEvent.count();
  if (hasOutbox > 0) {
    console.log(`  ↪ skip (sudah ada ${hasOutbox} event)`);
  } else {
    const journal = await prisma.journalEntry.findFirst({ where: { firmId: firm.id } });
    const jeId = journal?.id ?? null;

    const processed = await prisma.outboxEvent.create({
      data: {
        eventType: "journalApproved",
        payload: { journalId: jeId, firmId: firm.id, status: "APPROVED" },
        status: "PROCESSED",
        retryCount: 0,
        maxRetries: 3,
        processedAt: minutesAgo(35),
        processAfter: minutesAgo(35),
      },
    });
    await prisma.notificationLog.create({
      data: {
        outboxId: processed.id,
        status: "SENT",
        statusCode: 200,
        response: "OK — delivered to hook.majujaya.id",
        sentAt: minutesAgo(35),
      },
    });

    await prisma.outboxEvent.create({
      data: {
        eventType: "slaBreach",
        payload: { firmId: firm.id, stage: "TAX", message: "SLA breach — review pajak melewati tenggat" },
        status: "FAILED",
        retryCount: 2,
        maxRetries: 3,
        lastError: "timeout after 10s — endpoint tidak merespons",
        processAfter: new Date(NOW.getTime() + 15 * 60_000),
      },
    });

    await prisma.outboxEvent.create({
      data: {
        eventType: "reportReady",
        payload: { firmId: firm.id, clientId: sentosa.id, report: "laporan-laba-rugi-2026-07" },
        status: "PENDING",
        retryCount: 0,
        maxRetries: 3,
        processAfter: new Date(NOW.getTime() + 5 * 60_000),
      },
    });
    console.log("  ✅ journalApproved (PROCESSED) + slaBreach (FAILED, retry 2/3) + reportReady (PENDING)");
  }

  console.log("\n🎉 Data demo tambahan siap. Ringkasan:");
  console.log(`   ClientProfile : ${await prisma.clientProfile.count()}`);
  console.log(`   OutboxEvent   : ${await prisma.outboxEvent.count()}`);
  console.log(`   Webhook       : ${await prisma.webhookSubscription.count()}`);
  console.log(`   Notification  : ${await prisma.notificationLog.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
