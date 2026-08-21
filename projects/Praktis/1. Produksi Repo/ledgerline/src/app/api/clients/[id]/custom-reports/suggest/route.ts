import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { suggestReportStructure } from "@/server/custom-report";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/clients/[id]/custom-reports/suggest
 * Body: { prompt, period } → AI usulkan struktur laporan (rule-based deterministik).
 */
export const POST = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { prompt?: string; period?: string } | null;
  const prompt = body?.prompt?.trim();
  const period = body?.period?.trim();
  if (!prompt || !period) {
    return NextResponse.json({ error: "Body: { prompt, period } wajib." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Format periode: YYYY-MM." }, { status: 400 });
  }

  const structure = suggestReportStructure(prompt, period);
  return NextResponse.json({ data: structure });
});
