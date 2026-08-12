import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getTrialBalance, parsePeriod, trialBalanceCsv, trialBalanceXlsx } from "@/server/trial-balance";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]/trial-balance?period=2026-08&format=json|csv|xlsx
 * Neraca percobaan per klien & periode (tenant-scoped).
 * Hanya jurnal APPROVED yang dihitung; komparatif vs bulan lalu disertakan.
 */
export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? currentPeriod();
  const format = searchParams.get("format") ?? "json";

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

  const report = await getTrialBalance(client.id, client.name, period);
  if (!report) {
    return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
  }

  if (format === "csv") {
    const csv = "\uFEFF" + trialBalanceCsv(report); // BOM agar Excel membaca UTF-8
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="neraca-percobaan-${period}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const buffer = await trialBalanceXlsx(report);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="neraca-percobaan-${period}.xlsx"`,
      },
    });
  }

  if (format === "worksheet" || format === "worksheet-csv") {
    const { buildWorksheet, worksheetCsv } = await import("@/server/worksheet");
    const ws = buildWorksheet(report.rows, client.name, period);
    if (format === "worksheet-csv") {
      return new NextResponse("\uFEFF" + worksheetCsv(ws), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="neraca-lajur-${period}.csv"`,
        },
      });
    }
    return NextResponse.json({ data: ws });
  }

  return NextResponse.json({ data: report });
});

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
