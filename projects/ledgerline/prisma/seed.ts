/**
 * Seed demo LedgerLine — mencerminkan kondisi mockup dashboard:
 * 1 firm, 6 user (admin dev + 4 role), 3 klien, dokumen, 22 jurnal
 * lintas stage pipeline, activity log, SLA events (2 breach).
 *
 * Jalankan: npx prisma db seed
 */
import {
  PrismaClient,
  Role,
  Industry,
  DocumentType,
  DocumentStatus,
  JournalStatus,
  ReviewStage,
  ReviewTaskStatus,
  SlaStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedKnowledgeFromFiles } from "../src/server/knowledge";

const prisma = new PrismaClient();

const NOW = new Date();
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

// Password semua akun demo: password123
const PASSWORD_HASH = bcrypt.hashSync("password123", 10);

type StageTaskMap = Partial<
  Record<ReviewStage, { status: ReviewTaskStatus; assignee: string; offsetMinutes?: number }>
>;

// Stage task untuk tiap status jurnal.
// offsetMinutes = waktu review relatif terhadap createdAt jurnal (konsisten!).
const STAGE_TASKS: Record<JournalStatus, StageTaskMap | null> = {
  DRAFT: null,
  JUNIOR_REVIEW: { JUNIOR: { status: "PENDING", assignee: "budi" } },
  SENIOR_REVIEW: {
    JUNIOR: { status: "APPROVED", assignee: "budi", offsetMinutes: 80 },
    SENIOR: { status: "PENDING", assignee: "rina" },
  },
  TAX_REVIEW: {
    JUNIOR: { status: "APPROVED", assignee: "budi", offsetMinutes: 90 },
    SENIOR: { status: "APPROVED", assignee: "rina", offsetMinutes: 150 },
    TAX: { status: "PENDING", assignee: "sari" },
  },
  PARTNER_APPROVAL: {
    JUNIOR: { status: "APPROVED", assignee: "budi", offsetMinutes: 100 },
    SENIOR: { status: "APPROVED", assignee: "rina", offsetMinutes: 170 },
    TAX: { status: "APPROVED", assignee: "sari", offsetMinutes: 240 },
    PARTNER: { status: "PENDING", assignee: "andi" },
  },
  APPROVED: {
    JUNIOR: { status: "APPROVED", assignee: "budi", offsetMinutes: 80 },
    SENIOR: { status: "APPROVED", assignee: "rina", offsetMinutes: 160 },
    TAX: { status: "APPROVED", assignee: "sari", offsetMinutes: 260 },
    PARTNER: { status: "APPROVED", assignee: "andi", offsetMinutes: 330 },
  },
  EXCEPTION: null,
  REJECTED: null,
  FINALIZED: null,
  ARCHIVED: null,
};

const SLA_TARGET_MIN: Record<ReviewStage, number> = {
  JUNIOR: 120, // 2 jam
  SENIOR: 240, // 4 jam
  TAX: 240, // 4 jam
  PARTNER: 120, // 2 jam
};

type LineSeed = {
  accountCode: string;
  accountName: string;
  debit?: number;
  credit?: number;
  psakRef: string;
  notes?: string;
};

async function main() {
  console.log("🧹 Membersihkan data lama...");
  await prisma.activityLog.deleteMany();
  await prisma.slaEvent.deleteMany();
  await prisma.reviewTask.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.document.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.firm.deleteMany();

  console.log("🏢 Membuat firm & user...");
  const firm = await prisma.firm.create({
    data: { name: "KAP LedgerLine Demo", slug: "ledgerline-demo" },
  });

  const users: Record<string, string> = {};
  const userDefs: Array<[string, string, Role]> = [
    ["admin", "Admin Dev", Role.ADMIN],
    ["budi", "Budi Santoso", Role.JUNIOR],
    ["dwi", "Dwi Lestari", Role.JUNIOR],
    ["rina", "Rina Hartono", Role.SENIOR],
    ["sari", "Sari Wulandari", Role.TAX],
    ["andi", "Andi Pratama", Role.PARTNER],
  ];
  for (const [key, name, role] of userDefs) {
    const u = await prisma.user.create({
      data: {
        firmId: firm.id,
        email: `${key}@ledgerline.dev`,
        name,
        role,
        passwordHash: PASSWORD_HASH,
      },
    });
    users[key] = u.id;
  }

  console.log("🏢 Membuat klien...");
  const clientDefs: Array<[string, string, Industry]> = [
    ["majujaya", "PT Maju Jaya", Industry.RETAIL],
    ["berkah", "CV Berkah Abadi", Industry.SERVICES],
    ["sentosa", "PT Sentosa", Industry.FNB],
  ];
  const clients: Record<string, string> = {};
  for (const [key, name, industry] of clientDefs) {
    const c = await prisma.client.create({
      data: { firmId: firm.id, name, industry, taxId: "01.234.567.8-901.000" },
    });
    clients[key] = c.id;
  }

  console.log("📄 Membuat dokumen...");
  const docDefs: Array<[string, string, DocumentType, DocumentStatus]> = [
    ["majujaya", "invoice-majujaya-0812.pdf", DocumentType.INVOICE, DocumentStatus.PROCESSED],
    ["berkah", "rekening-koran-berkah-0726.xlsx", DocumentType.BANK_STATEMENT, DocumentStatus.PROCESSED],
    ["sentosa", "invoice-sentosa-0731.jpg", DocumentType.INVOICE, DocumentStatus.PROCESSING],
  ];
  for (const [clientKey, fileName, type, status] of docDefs) {
    await prisma.document.create({
      data: {
        firmId: firm.id,
        clientId: clients[clientKey],
        type,
        mimeType: fileName.endsWith(".pdf") ? "application/pdf" : fileName.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "image/jpeg",
        fileName,
        filePath: `uploads/${fileName}`,
        fileHash: `demo-${fileName}`,
        sizeBytes: 120_000,
        status,
      },
    });
  }

  console.log("📒 Membuat jurnal + baris + task review...");

  const journalDefs: Array<{
    clientKey: string;
    status: JournalStatus;
    confidence: number;
    description: string;
    exceptionFlag?: string;
    createdAt: Date;
    lines: LineSeed[];
    urgent?: boolean;
  }> = [];

  const sales = (
    amount: number, ref: string, createdAt: Date, clientKey: string,
    desc: string, confidence: number, status: JournalStatus, urgent = false,
  ): Parameters<typeof journalDefs.push>[0] => {
    const ppn = Math.round(amount * 0.11);
    return {
      clientKey, status, confidence, description: desc, createdAt, urgent,
      lines: [
        { accountCode: "1-1200", accountName: "Piutang Usaha", debit: amount + ppn, psakRef: ref },
        { accountCode: "4-1000", accountName: "Pendapatan Penjualan", credit: amount, psakRef: ref },
        { accountCode: "2-2000", accountName: "PPN Keluaran", credit: ppn, psakRef: ref, notes: "PPN 11%" },
      ],
    };
  };

  const purchase = (
    amount: number, ref: string, createdAt: Date, clientKey: string,
    desc: string, confidence: number, status: JournalStatus, urgent = false,
  ): Parameters<typeof journalDefs.push>[0] => {
    const ppn = Math.round(amount * 0.11);
    return {
      clientKey, status, confidence, description: desc, createdAt, urgent,
      lines: [
        { accountCode: "1-1300", accountName: "Persediaan Barang Dagang", debit: amount, psakRef: ref },
        { accountCode: "1-1400", accountName: "PPN Masukan", debit: ppn, psakRef: ref, notes: "PPN 11%" },
        { accountCode: "1-1000", accountName: "Kas", credit: amount + ppn, psakRef: ref },
      ],
    };
  };

  // DRAFT (8): 5 PT Maju Jaya, 3 PT Sentosa
  for (let i = 1; i <= 5; i++) {
    journalDefs.push(sales(8_500_000 + i * 250_000, "PSAK 72", minutesAgo(45 - i), "majujaya", `Penjualan kredit #INV-00${i} — PT Maju Jaya`, 0.93 + (i % 3) * 0.01, JournalStatus.DRAFT));
  }
  for (let i = 1; i <= 3; i++) {
    journalDefs.push(purchase(4_200_000 + i * 300_000, "PSAK 14", minutesAgo(30 - i), "sentosa", `Pembelian bahan baku #PO-${i} — PT Sentosa`, 0.9 + (i % 2) * 0.02, JournalStatus.DRAFT));
  }

  // JUNIOR_REVIEW (5): 3 CV Berkah, 2 PT Maju Jaya (1 urgent)
  journalDefs.push(
    purchase(12_000_000, "PSAK 14", minutesAgo(130), "berkah", "Pembelian perlengkapan kantor — CV Berkah Abadi", 0.88, JournalStatus.JUNIOR_REVIEW, true),
    sales(6_750_000, "PSAK 72", minutesAgo(150), "berkah", "Penjualan jasa konsultasi — CV Berkah Abadi", 0.91, JournalStatus.JUNIOR_REVIEW),
    purchase(3_900_000, "PSAK 14", minutesAgo(165), "berkah", "Pembelian ATK — CV Berkah Abadi", 0.95, JournalStatus.JUNIOR_REVIEW),
    sales(15_000_000, "PSAK 72", minutesAgo(140), "majujaya", "Penjualan kredit #INV-008 — PT Maju Jaya", 0.94, JournalStatus.JUNIOR_REVIEW),
    purchase(7_200_000, "PSAK 14", minutesAgo(155), "majujaya", "Pembelian stok — PT Maju Jaya", 0.92, JournalStatus.JUNIOR_REVIEW),
  );

  // SENIOR_REVIEW (3): 2 PT Sentosa, 1 CV Berkah
  journalDefs.push(
    sales(9_400_000, "PSAK 72", minutesAgo(260), "sentosa", "Penjualan catering — PT Sentosa", 0.89, JournalStatus.SENIOR_REVIEW),
    purchase(5_600_000, "PSAK 14", minutesAgo(280), "sentosa", "Pembelian bahan baku — PT Sentosa", 0.93, JournalStatus.SENIOR_REVIEW),
    sales(3_300_000, "PSAK 72", minutesAgo(250), "berkah", "Penjualan jasa — CV Berkah Abadi", 0.9, JournalStatus.SENIOR_REVIEW),
  );

  // TAX_REVIEW (2): 1 CV Berkah, 1 PT Maju Jaya
  journalDefs.push(
    purchase(22_000_000, "PSAK 14", minutesAgo(380), "berkah", "Pembelian aset — CV Berkah Abadi", 0.86, JournalStatus.TAX_REVIEW),
    sales(18_500_000, "PSAK 72", minutesAgo(400), "majujaya", "Penjualan kredit #INV-012 — PT Maju Jaya", 0.9, JournalStatus.TAX_REVIEW),
  );

  // PARTNER_APPROVAL (1): PT Sentosa
  journalDefs.push(
    sales(27_000_000, "PSAK 72", minutesAgo(500), "sentosa", "Penjualan event besar — PT Sentosa", 0.95, JournalStatus.PARTNER_APPROVAL),
  );

  // APPROVED (2): PT Sentosa, PT Maju Jaya
  journalDefs.push(
    sales(11_200_000, "PSAK 72", minutesAgo(700), "sentosa", "Penjualan rutin — PT Sentosa", 0.97, JournalStatus.APPROVED),
    purchase(8_900_000, "PSAK 14", minutesAgo(650), "majujaya", "Pembelian stok — PT Maju Jaya", 0.96, JournalStatus.APPROVED),
  );

  // EXCEPTION (1): CV Berkah — faktur PPN tidak ditemukan
  journalDefs.push({
    clientKey: "berkah",
    status: JournalStatus.EXCEPTION,
    confidence: 0.55,
    description: "Pembelian — faktur PPN belum tersedia — CV Berkah Abadi",
    exceptionFlag: "Faktur PPN tidak ditemukan",
    createdAt: minutesAgo(5),
    lines: [
      { accountCode: "1-1300", accountName: "Persediaan Barang Dagang", debit: 16_500_000, psakRef: "PSAK 14" },
      { accountCode: "2-1100", accountName: "Utang Usaha", credit: 16_500_000, psakRef: "PSAK 14" },
    ],
  });

  // Simpan semua jurnal
  for (const j of journalDefs) {
    const entry = await prisma.journalEntry.create({
      data: {
        firmId: firm.id,
        clientId: clients[j.clientKey],
        status: j.status,
        confidence: j.confidence,
        description: j.description,
        exceptionFlag: j.exceptionFlag,
        createdByAi: true,
        createdAt: j.createdAt,
        lines: { create: j.lines.map((l) => ({ ...l, debit: l.debit ?? 0, credit: l.credit ?? 0 })) },
      },
    });

    const tasks = STAGE_TASKS[j.status];
    if (tasks) {
      for (const [stage, t] of Object.entries(tasks) as Array<[ReviewStage, { status: ReviewTaskStatus; assignee: string; offsetMinutes?: number }]>) {
        const reviewedAt =
          t.offsetMinutes !== undefined
            ? new Date(j.createdAt.getTime() + t.offsetMinutes * 60_000)
            : undefined;
        await prisma.reviewTask.create({
          data: {
            journalEntryId: entry.id,
            stage,
            assigneeId: users[t.assignee],
            status: t.status,
            urgent: j.urgent ?? false,
            // Task selesai: createdAt = waktu mulai review (25 mnt sebelum reviewedAt)
            // → durasi review positif & konsisten dengan metrik (reviewedAt − createdAt).
            createdAt:
              t.status === "APPROVED" && reviewedAt
                ? new Date(reviewedAt.getTime() - 25 * 60_000)
                : new Date(),
            // Task pending: tenggat ke depan; urgent sengaja lewat 15 mnt (simulasi breach).
            // Task riwayat (sudah di-review): tenggat dihitung dari createdAt jurnal.
            dueAt:
              t.status === "PENDING"
                ? j.urgent
                  ? new Date(Date.now() - 15 * 60_000)
                  : new Date(Date.now() + SLA_TARGET_MIN[stage] * 60_000)
                : new Date(j.createdAt.getTime() + SLA_TARGET_MIN[stage] * 60_000),
            reviewedAt,
            note: t.status === "APPROVED" ? "Disetujui — sesuai referensi" : null,
          },
        });

        // SLA event per task selesai — ter-link ke jurnal (untuk metrik per clerk)
        if (t.status === "APPROVED") {
          const actualMinutes = t.offsetMinutes ?? 0;
          const targetMinutes = SLA_TARGET_MIN[stage];
          await prisma.slaEvent.create({
            data: {
              firmId: firm.id,
              journalEntryId: entry.id,
              stage,
              targetMinutes,
              actualMinutes,
              status: actualMinutes <= targetMinutes ? SlaStatus.MET : SlaStatus.BREACHED,
              createdAt: new Date(j.createdAt.getTime() + actualMinutes * 60_000),
            },
          });
        }
      }
    }
  }

  console.log("📜 Membuat activity log & SLA events...");
  await prisma.activityLog.createMany({
    data: [
      { firmId: firm.id, action: "AI_DRAFT_COMPLETED", detail: { message: "AI menyelesaikan draft jurnal untuk PT Maju Jaya" }, createdAt: minutesAgo(2) },
      { firmId: firm.id, action: "EXCEPTION_FLAGGED", detail: { message: "Faktur PPN tidak ditemukan untuk CV Berkah" }, createdAt: minutesAgo(5) },
      { firmId: firm.id, userId: users.rina, action: "REVIEW_APPROVED", detail: { message: "Rina menyetujui 12 entri jurnal untuk PT Sentosa" }, createdAt: minutesAgo(8) },
      { firmId: firm.id, action: "AI_DRAFT_COMPLETED", detail: { message: "AI menyelesaikan draft jurnal untuk CV Berkah" }, createdAt: minutesAgo(12) },
      { firmId: firm.id, userId: users.budi, action: "REVIEW_APPROVED", detail: { message: "Budi menyetujui 4 entri jurnal untuk PT Maju Jaya" }, createdAt: minutesAgo(25) },
    ],
  });

  // SLA events sekarang dibuat per task selesai (ter-link ke journalEntryId).

  // EN-01: impor 13 file knowledge → KnowledgeItem ACTIVE v1 (idempotent)
  const kbCreated = await seedKnowledgeFromFiles();
  if (kbCreated > 0) {
    console.log(`Knowledge Platform: ${kbCreated} item di-seed dari file.`);
  }

  console.log("✅ Seed selesai.");
  console.log(`Firm: ${firm.name} (${firm.slug})`);
  console.log("Akun demo (password: password123):");
  console.log("  admin@ledgerline.dev  — ADMIN");
  console.log("  budi@ledgerline.dev   — JUNIOR");
  console.log("  dwi@ledgerline.dev    — JUNIOR");
  console.log("  rina@ledgerline.dev   — SENIOR");
  console.log("  sari@ledgerline.dev   — TAX");
  console.log("  andi@ledgerline.dev   — PARTNER");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
