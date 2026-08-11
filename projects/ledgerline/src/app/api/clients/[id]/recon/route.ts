import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import {
  buildReconSummary,
  getBankMutations,
  getCashJournals,
  suggestMatches,
} from "@/server/recon";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]/recon?period=YYYY-MM
 * Mutasi bank + jurnal kas + saran AI matching + ringkasan outstanding.
 */
export const GET = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true, name: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? undefined;
  if (!period) return NextResponse.json({ error: "Parameter period (YYYY-MM) wajib." }, { status: 400 });

  try {
    const [mutations, journals] = await Promise.all([
      getBankMutations(client.id, period),
      getCashJournals(client.id, period),
    ]);
    const suggestions = suggestMatches(mutations, journals);
    const summary = buildReconSummary(period, mutations, journals);
    return NextResponse.json({
      data: {
        clientName: client.name,
        period,
        mutations,
        journals,
        suggestions,
        summary,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
});
