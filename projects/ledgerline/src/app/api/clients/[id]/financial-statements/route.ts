import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getTrialBalance } from "@/server/trial-balance";
import {
  buildBalanceSheet,
  buildCashFlowStatement,
  buildEquityStatement,
  buildIncomeStatement,
  statementCsv,
  type FinancialStatement,
} from "@/server/financial-statements";

type Ctx = { params: Promise<{ id: string }> };

const TYPES = ["labarugi", "neraca", "ekuitas", "aruskas"] as const;
type StatementType = (typeof TYPES)[number];

/**
 * GET /api/clients/[id]/financial-statements?period=&type=labarugi|neraca|ekuitas|aruskas&format=json|csv
 * Laporan akhir dalam format laporan Indonesia (dari trial balance APPROVED/FINALIZED).
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
  const type = (url.searchParams.get("type") ?? "labarugi") as StatementType;
  const format = url.searchParams.get("format") ?? "json";
  if (!period) return NextResponse.json({ error: "Parameter period (YYYY-MM) wajib." }, { status: 400 });
  if (!(TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: `type harus salah satu dari: ${TYPES.join(", ")}` }, { status: 400 });
  }

  const tb = await getTrialBalance(client.id, client.name, period);
  if (!tb) return NextResponse.json({ error: "Periode tidak valid (YYYY-MM)." }, { status: 400 });
  const rows = tb.rows;

  let stmt: FinancialStatement;
  switch (type) {
    case "labarugi":
      stmt = buildIncomeStatement(rows, client.name, period);
      break;
    case "neraca": {
      const laba = buildIncomeStatement(rows, client.name, period).lines.find((l) => l.label.includes("LABA (RUGI)"))?.amount ?? 0;
      stmt = buildBalanceSheet(rows, client.name, period, laba);
      break;
    }
    case "ekuitas": {
      const laba = buildIncomeStatement(rows, client.name, period).lines.find((l) => l.label.includes("LABA (RUGI)"))?.amount ?? 0;
      stmt = buildEquityStatement(rows, client.name, period, laba);
      break;
    }
    case "aruskas":
      stmt = buildCashFlowStatement(rows, client.name, period);
      break;
  }

  if (format === "csv") {
    const csv = "\uFEFF" + statementCsv(stmt);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-${period}.csv"`,
      },
    });
  }
  return NextResponse.json({ data: stmt });
});
