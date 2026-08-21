import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { saveReportTemplate, type ReportKind, type ReportTemplate } from "@/server/custom-report";

type Ctx = { params: Promise<{ id: string }> };

const KINDS: ReportKind[] = [
  "LABA_RUGI",
  "NERACA",
  "ARUS_KAS",
  "PENJUALAN",
  "BEBAN",
  "PENDAPATAN_PER_PROYEK",
  "BEBAN_PER_CHANNEL",
  "PENJUALAN_PER_CHANNEL",
];

/**
 * POST /api/clients/[id]/custom-reports/templates
 * Body: { name, kind, description?, dimensions?, groupBy?, period } → simpan template
 * (alur "setujui usulan AI").
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

  const body = (await req.json().catch(() => null)) as Partial<ReportTemplate> | null;
  const name = body?.name?.trim();
  const kind = body?.kind;
  const period = body?.period?.trim();
  if (!name || !kind || !period) {
    return NextResponse.json({ error: "Body: { name, kind, period } wajib." }, { status: 400 });
  }
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: `Jenis laporan tidak dikenal. Gunakan: ${KINDS.join(", ")}.` }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Format periode: YYYY-MM." }, { status: 400 });
  }

  const template = await saveReportTemplate(
    client.id,
    guard.session.user.firmId,
    {
      name,
      kind,
      description: body.description?.trim() ?? undefined,
      dimensions: body.dimensions ?? {},
      groupBy: body.groupBy ?? null,
      period,
    },
    guard.session.user.id,
  );
  return NextResponse.json({ data: template, message: "Template laporan disimpan." }, { status: 201 });
});
