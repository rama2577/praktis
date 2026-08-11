import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { assetReconciliationCsv, getAssetReconciliation } from "@/server/assets";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/clients/[id]/assets/report?period=YYYY-MM&format=json|csv — rekonsiliasi fiskal. */
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
  const format = url.searchParams.get("format") ?? "json";
  if (!period) return NextResponse.json({ error: "Parameter period (YYYY-MM) wajib." }, { status: 400 });

  try {
    const report = await getAssetReconciliation(client.id, period);
    if (format === "csv") {
      const csv = "\uFEFF" + assetReconciliationCsv(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="rekonsiliasi-aset-${period}.csv"`,
        },
      });
    }
    return NextResponse.json({ data: report });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
});
