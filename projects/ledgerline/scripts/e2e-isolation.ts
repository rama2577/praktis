/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * E2E F0 — Isolasi tenant (TD-09 / SE-01).
 *
 * Membuat firma kedua + user + klien + dokumen + jurnal (JUNIOR_REVIEW & EXCEPTION),
 * lalu memverifikasi user firma A TIDAK bisa melihat/mengakses data firma B:
 *   1. /api/clients — daftar klien firma A tidak memuat klien firma B
 *   2. /api/queues — task review firma B tidak bocor ke firma A
 *   3. /api/dashboard — agregat firma A tidak memuat data firma B
 *   4. /api/documents (POST) — upload ke klien firma B dari firma A ditolak (400)
 *   5. /api/exceptions — exception firma B tidak bocor ke firma A
 *   6. /api/clients/[id] (PATCH) — akses langsung klien firma B dari firma A ditolak (404/403)
 *   + kontrol: user firma B melihat data firmanya sendiri (queues).
 *
 * Prasyarat: server :3000 + Redis hidup, seed sudah dijalankan (firma A).
 * Jalankan: npx tsx scripts/e2e-isolation.ts
 */
import {
  PrismaClient,
  Role,
  Industry,
  DocumentType,
  DocumentStatus,
  JournalStatus,
  ReviewStage,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";
const PASSWORD = process.env.TEST_PASSWORD ?? "password123";

const FIRM_B_SLUG = "firma-lain-test";
const FIRM_B_NAME = "Firma Lain Test";
const USER_B_EMAIL = "alien@ledgerline.dev";
const CLIENT_B_NAME = "PT Alien Corp";
const DOC_B_NAME = "alien-invoice.pdf";
const JOURNAL_B_DESC = "Penjualan alien — rahasia firma B";
const EXCEPTION_B_DESC = "Pembelian alien — faktur tidak ditemukan";

class Session {
  private jar = new Map<string, string>();

  private cookieHeader(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async login(email: string): Promise<boolean> {
    this.jar.clear();
    const csrf = (await (await this.req("/api/auth/csrf")).json()) as { csrfToken: string };
    const res = await this.req("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password: PASSWORD }).toString(),
    });
    return res.status === 302;
  }

  private async req(path: string, init: RequestInit = {}) {
    const res = await fetch(BASE + path, {
      ...init,
      redirect: "manual",
      headers: { ...(init.headers ?? {}), cookie: this.cookieHeader() },
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) this.jar.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
    return res;
  }

  async api(path: string, init?: RequestInit): Promise<{ status: number; body: any }> {
    const res = await this.req(path, init);
    const text = await res.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text.slice(0, 200) };
    }
    return { status: res.status, body };
  }
}

function check(cond: boolean, label: string) {
  if (!cond) {
    console.error("❌ GAGAL:", label);
    process.exitCode = 1;
  } else {
    console.log("✓", label);
  }
}

async function cleanupFirmB(firmId: string) {
  await prisma.activityLog.deleteMany({ where: { firmId } });
  await prisma.slaEvent.deleteMany({ where: { firmId } });
  await prisma.reviewTask.deleteMany({ where: { journalEntry: { firmId } } });
  await prisma.journalEntry.deleteMany({ where: { firmId } }); // cascade journal lines
  await prisma.document.deleteMany({ where: { firmId } });
  await prisma.client.deleteMany({ where: { firmId } });
  await prisma.user.deleteMany({ where: { firmId } });
  await prisma.firm.delete({ where: { id: firmId } });
}

async function setupFirmB() {
  const old = await prisma.firm.findUnique({ where: { slug: FIRM_B_SLUG } });
  if (old) await cleanupFirmB(old.id);

  const firm = await prisma.firm.create({ data: { name: FIRM_B_NAME, slug: FIRM_B_SLUG } });
  const user = await prisma.user.create({
    data: {
      firmId: firm.id,
      email: USER_B_EMAIL,
      name: "Alien User",
      role: Role.JUNIOR,
      passwordHash: bcrypt.hashSync(PASSWORD, 10),
    },
  });
  const client = await prisma.client.create({
    data: { firmId: firm.id, name: CLIENT_B_NAME, industry: Industry.RETAIL },
  });
  await prisma.document.create({
    data: {
      firmId: firm.id,
      clientId: client.id,
      type: DocumentType.INVOICE,
      mimeType: "application/pdf",
      fileName: DOC_B_NAME,
      filePath: `uploads/${DOC_B_NAME}`,
      fileHash: "test-alien-doc",
      sizeBytes: 1_024,
      status: DocumentStatus.PROCESSED,
    },
  });
  const j1 = await prisma.journalEntry.create({
    data: {
      firmId: firm.id,
      clientId: client.id,
      status: JournalStatus.JUNIOR_REVIEW,
      confidence: 0.9,
      description: JOURNAL_B_DESC,
      createdByAi: true,
      lines: {
        create: [
          { accountCode: "1-1200", accountName: "Piutang Usaha", debit: 11_100_000, credit: 0, psakRef: "PSAK 72" },
          { accountCode: "4-1000", accountName: "Pendapatan Penjualan", debit: 0, credit: 10_000_000, psakRef: "PSAK 72" },
          { accountCode: "2-2000", accountName: "PPN Keluaran", debit: 0, credit: 1_100_000, psakRef: "PSAK 72", notes: "PPN 11%" },
        ],
      },
    },
  });
  await prisma.reviewTask.create({
    data: {
      journalEntryId: j1.id,
      stage: ReviewStage.JUNIOR,
      assigneeId: user.id,
      status: "PENDING",
      dueAt: new Date(Date.now() + 120 * 60_000),
    },
  });
  await prisma.journalEntry.create({
    data: {
      firmId: firm.id,
      clientId: client.id,
      status: JournalStatus.EXCEPTION,
      confidence: 0.5,
      description: EXCEPTION_B_DESC,
      exceptionFlag: "Faktur PPN tidak ditemukan",
      createdByAi: true,
      lines: {
        create: [
          { accountCode: "1-1300", accountName: "Persediaan", debit: 5_000_000, credit: 0, psakRef: "PSAK 14" },
          { accountCode: "2-1100", accountName: "Utang Usaha", debit: 0, credit: 5_000_000, psakRef: "PSAK 14" },
        ],
      },
    },
  });

  return { firm, client };
}

async function main() {
  let firmId = "";
  try {
    const { firm, client } = await setupFirmB();
    firmId = firm.id;

    const adminA = new Session();
    const alien = new Session();
    const okAdmin = await adminA.login("admin@ledgerline.dev");
    const okAlien = await alien.login(USER_B_EMAIL);
    if (!okAdmin || !okAlien) throw new Error("Login gagal (server hidup? seed sudah jalan?)");

    // 1. /api/clients — daftar firma A tidak memuat klien firma B
    const cA = await adminA.api("/api/clients");
    check(cA.status === 200, `/api/clients firma A → ${cA.status}`);
    check(!JSON.stringify(cA.body).includes(CLIENT_B_NAME), "firma A tidak melihat klien firma B");

    // Kontrol: user firma B melihat task-nya sendiri (data sendiri tetap tampil)
    const qB = await alien.api("/api/queues");
    check(qB.status === 200, `/api/queues firma B → ${qB.status}`);
    check(JSON.stringify(qB.body).includes(JOURNAL_B_DESC), "firma B melihat task miliknya sendiri");

    // 2. /api/queues — task firma B tidak bocor ke firma A
    const qA = await adminA.api("/api/queues");
    check(qA.status === 200, `/api/queues firma A → ${qA.status}`);
    check(!JSON.stringify(qA.body).includes(JOURNAL_B_DESC), "firma A tidak melihat task review firma B");

    // 3. /api/dashboard — agregat firma A tidak memuat data firma B
    const dA = await adminA.api("/api/dashboard");
    check(dA.status === 200, `/api/dashboard firma A → ${dA.status}`);
    check(!JSON.stringify(dA.body).includes(CLIENT_B_NAME), "dashboard firma A tidak memuat klien firma B");

    // 4. /api/documents (POST) — upload ke klien firma B dari firma A ditolak
    const form = new FormData();
    form.append("clientId", client.id);
    form.append("docType", "INVOICE");
    form.append("file", new File([Buffer.from("%PDF-1.4 test"), "x.pdf"], "x.pdf", { type: "application/pdf" }));
    const up = await adminA.api("/api/documents", { method: "POST", body: form });
    check(up.status === 400, `upload ke klien firma B dari firma A → ${up.status} (ditolak)`);
    check(!String(up.status).startsWith("2"), "upload lintas-firma tidak berhasil");

    // 5. /api/exceptions — exception firma B tidak bocor ke firma A
    const eA = await adminA.api("/api/exceptions");
    check(eA.status === 200, `/api/exceptions firma A → ${eA.status}`);
    check(!JSON.stringify(eA.body).includes(EXCEPTION_B_DESC), "firma A tidak melihat exception firma B");

    // 6. /api/clients/[id] (PATCH) — akses langsung klien firma B dari firma A ditolak
    const direct = await adminA.api(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "HACK" }),
    });
    check(
      direct.status === 404 || direct.status === 403,
      `PATCH klien firma B dari firma A → ${direct.status} (404/403)`,
    );

    console.log(process.exitCode ? "❌ ISOLASI TENANT GAGAL" : "✅ ISOLASI TENANT LULUS (8/8)");
  } finally {
    if (firmId) await cleanupFirmB(firmId);
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
