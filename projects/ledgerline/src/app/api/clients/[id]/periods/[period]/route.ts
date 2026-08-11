import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { PARTNER_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getFiscalPeriodStatus, periodOf } from "@/server/ledger";

type Ctx = { params: Promise<{ id: string; period: string }> };

/**
 * GET /api/clients/[id]/periods/[period] — status periode tutup buku
 * (untuk UI lock state). Hanya partner/admin.
 */
export const GET = withTenantApi<Ctx>(async (_request, ctx) => {
  const guard = await requireRoleApi(PARTNER_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id, period } = await ctx.params;
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });
  }

  const status = await getFiscalPeriodStatus(client.id, period);
  return NextResponse.json({
    data: {
      clientId: client.id,
      period,
      status,
      canLock: true,
      today: periodOf(new Date()),
    },
  });
});
