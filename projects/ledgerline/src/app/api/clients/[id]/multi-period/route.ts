/**
 * GET /api/clients/[id]/multi-period?periods=YYYY-MM,YYYY-MM,YYYY-MM
 * Mengembalikan ikhtisar keuangan multi-periode.
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getTrialBalance } from "@/server/trial-balance";
import { buildMultiPeriodHighlights } from "@/server/multi-period";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id: clientId } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const periodsRaw = searchParams.get("periods");
  if (!periodsRaw) return NextResponse.json({ error: "Parameter periods wajib diisi" }, { status: 400 });

  const periodList = periodsRaw.split(",").map((p) => p.trim()).filter(Boolean);
  if (periodList.length === 0) return NextResponse.json({ error: "Minimal 1 periode" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const reports = await Promise.all(
    periodList.map((p) => getTrialBalance(clientId, client.name, p)),
  );

  const periodRanges = reports
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => ({ period: r.period, rows: r.rows }));

  if (periodRanges.length === 0) {
    return NextResponse.json({ error: "Tidak ada data untuk periode yang diminta" }, { status: 404 });
  }

  const highlights = buildMultiPeriodHighlights(client.name, periodRanges);
  return NextResponse.json({ data: highlights });
});
