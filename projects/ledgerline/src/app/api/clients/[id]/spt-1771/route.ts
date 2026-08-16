/**
 * GET /api/clients/[id]/spt-1771?year=2026&mode=31e|pp23|normal
 * Data SPT 1771: rekonsiliasi fiskal (Lampiran I), penyusutan (II), PPh (III).
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { prisma } from "@/lib/db";
import { buildSpt1771 } from "@/server/spt-1771";
import { isSptAnnualUnlocked } from "@/server/billing";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;
  const year = parseInt(request.nextUrl.searchParams.get("year") ?? "", 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Parameter year wajib (YYYY)" }, { status: 400 });
  }
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode && !["31e", "pp23", "normal"].includes(mode)) {
    return NextResponse.json({ error: "Mode harus 31e | pp23 | normal" }, { status: 400 });
  }
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { name: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  // F-5 paywall: modul SPT Tahunan butuh langganan (annualPaidAt) saat BILLING_ENFORCE aktif.
  const unlocked = await isSptAnnualUnlocked(guard.session.user.firmId);
  if (!unlocked) {
    return NextResponse.json(
      { error: "Modul SPT Tahunan terkunci — butuh langganan SPT Tahunan (annualPaidAt)." },
      { status: 402 },
    );
  }
  const data = await buildSpt1771(id, client.name, year, (mode as "31e" | "pp23" | "normal") ?? "31e");
  return NextResponse.json({ data });
});
