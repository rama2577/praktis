import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getLedger } from "@/server/ledger";
import { parsePeriod } from "@/server/trial-balance";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]/ledger?accountCode=1-1100&period=2026-08
 * Buku besar satu akun per periode (tenant-scoped; jurnal APPROVED/FINALIZED).
 */
export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const accountCode = searchParams.get("accountCode") ?? "";
  const period = searchParams.get("period") ?? "";

  if (!accountCode.trim()) {
    return NextResponse.json({ error: "Parameter accountCode wajib diisi." }, { status: 400 });
  }
  if (!parsePeriod(period)) {
    return NextResponse.json({ error: "Periode tidak valid. Gunakan format YYYY-MM." }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true, name: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });
  }

  const report = await getLedger(client.id, client.name, accountCode.trim(), period);
  return NextResponse.json({ data: report });
});
