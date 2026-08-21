import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { buildReconSummary, getBankMutations, getCashJournals, reconCsv } from "@/server/recon";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/clients/[id]/recon/export?period=&format=csv|json — laporan rekonsiliasi. */
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
  const format = url.searchParams.get("format") ?? "csv";
  if (!period) return NextResponse.json({ error: "Parameter period (YYYY-MM) wajib." }, { status: 400 });

  const [mutations, journals] = await Promise.all([
    getBankMutations(client.id, period),
    getCashJournals(client.id, period),
  ]);
  const summary = buildReconSummary(period, mutations, journals);

  if (format === "json") {
    return NextResponse.json({ data: summary });
  }
  const csv = "\uFEFF" + reconCsv(summary, client.name);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rekonsiliasi-bank-${period}.csv"`,
    },
  });
});
