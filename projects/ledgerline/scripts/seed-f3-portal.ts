import { prisma } from "../src/lib/db";
import { getTrialBalance } from "../src/server/trial-balance";
import { createReportSnapshot, notifyClient, ensurePortalToken } from "../src/server/portal";

async function main() {
  const client = await prisma.client.findFirst({
    where: { name: "PT Maju Jaya" },
    include: { firm: true },
  });
  if (!client) throw new Error("PT Maju Jaya tidak ditemukan");
  const period = "2026-08";

  // Snapshot TB untuk periode yang sudah CLOSED (K5)
  const tb = await getTrialBalance(client.id, client.name, period);
  if (tb) {
    const existing = await prisma.reportSnapshot.count({ where: { clientId: client.id, period, type: "TRIAL_BALANCE" } });
    if (existing === 0) {
      const snap = await createReportSnapshot({
        firmId: client.firmId,
        clientId: client.id,
        period,
        type: "TRIAL_BALANCE",
        payload: {
          clientName: tb.clientName,
          rows: tb.rows,
          totalDebit: tb.totalDebit,
          totalCredit: tb.totalCredit,
          balanced: tb.balanced,
          periodStatus: tb.periodStatus,
          capturedAt: new Date().toISOString(),
        } as never,
      });
      console.log("snapshot:", snap);
    } else {
      console.log("snapshot sudah ada, skip");
    }
  }

  // Notifikasi (K4)
  const notifCount = await prisma.clientNotification.count({ where: { clientId: client.id } });
  if (notifCount === 0) {
    await notifyClient({
      firmId: client.firmId,
      clientId: client.id,
      type: "REPORT_READY",
      message: `Laporan periode ${period} sudah dikunci dan tersedia di portal.`,
    });
    await notifyClient({
      firmId: client.firmId,
      clientId: client.id,
      type: "DOCUMENT_PROCESSED",
      message: "Dokumen rekening koran Juni 2026 selesai diproses dan sudah dicatat.",
    });
    console.log("notifikasi dibuat");
  } else {
    console.log("notifikasi sudah ada, skip");
  }

  // Token portal
  const tok = await ensurePortalToken(client.id);
  console.log("portal token:", tok.token);
}

main().finally(() => prisma.$disconnect());
