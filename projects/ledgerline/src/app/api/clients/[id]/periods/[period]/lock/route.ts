import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { PARTNER_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { lockPeriod } from "@/server/ledger";
import { getTrialBalance } from "@/server/trial-balance";
import { createReportSnapshot, notifyClient } from "@/server/portal";
import { ManualJournalError } from "@/server/manual-journal";

type Ctx = { params: Promise<{ id: string; period: string }> };

/**
 * POST /api/clients/[id]/periods/[period]/lock
 * Kunci periode tutup buku (PARTNER/ADMIN): FiscalPeriod → CLOSED dan semua
 * jurnal APPROVED periode tsb → FINALIZED.
 */
export const POST = withTenantApi<Ctx>(async (_request, ctx) => {
  const guard = await requireRoleApi(PARTNER_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id, period } = await ctx.params;
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Periode tidak valid. Gunakan format YYYY-MM." }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true, name: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });
  }

  try {
    const result = await lockPeriod({
      firmId: guard.session.user.firmId,
      clientId: client.id,
      period,
      lockedById: guard.session.user.id,
    });

    // F3/K5 — simpan snapshot laporan + F3/K4 — notifikasi klien
    try {
      const tb = await getTrialBalance(client.id, client.name, period);
      if (tb) {
        await createReportSnapshot({
          firmId: guard.session.user.firmId,
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
          createdById: guard.session.user.id,
        });
        await notifyClient({
          firmId: guard.session.user.firmId,
          clientId: client.id,
          type: "REPORT_READY",
          message: `Laporan periode ${period} sudah dikunci dan tersedia di portal.`,
        });
      }
    } catch (snapshotErr) {
      // Snapshot gagal tidak boleh menggagalkan lock — dicatat, lock tetap sukses.
      console.error("snapshot/notif gagal:", snapshotErr);
    }

    return NextResponse.json({ data: { ...result, clientId: client.id, period } });
  } catch (e) {
    if (e instanceof ManualJournalError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
});
