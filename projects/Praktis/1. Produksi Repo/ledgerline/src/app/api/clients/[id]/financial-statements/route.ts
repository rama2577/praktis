import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { applyRounding, ROUNDING_DIVISOR, type RoundingMode } from "@/lib/rounding";
import { getTrialBalance } from "@/server/trial-balance";
import { getEquityActivity } from "@/server/equity";
import {
  buildBalanceSheet,
  buildCashFlowStatement,
  buildEquityStatement,
  buildIncomeStatement,
  statementCsv,
  type FinancialStatement,
} from "@/server/financial-statements";
import { renderPdf, pdfResponse, xlsxBuffer, xlsxResponse } from "@/server/export";

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
  const rounding = (url.searchParams.get("rounding") ?? "none") as RoundingMode;
  if (!(rounding in ROUNDING_DIVISOR)) {
    return NextResponse.json({ error: "rounding harus none | ribu | juta" }, { status: 400 });
  }
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
      const activity = await getEquityActivity(client.id, period);
      stmt = buildEquityStatement(rows, client.name, period, laba, activity);
      break;
    }
    case "aruskas":
      stmt = buildCashFlowStatement(rows, client.name, period);
      break;
  }

  if (format === "csv") {
    const csv = "\uFEFF" + statementCsv({ ...stmt, lines: applyRounding(stmt.lines, rounding) });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-${period}.csv"`,
      },
    });
  }

  if (format === "pdf" || format === "xlsx") {
    const lines = applyRounding(stmt.lines, rounding);
    const label = (l: (typeof lines)[number]) => "  ".repeat(l.indent ?? 0) + l.label;
    if (format === "xlsx") {
      const buffer = await xlsxBuffer([
        {
          name: stmt.title,
          columns: [
            { header: "Keterangan", key: "label", width: 56 },
            { header: "Jumlah (Rp)", key: "amount", width: 22 },
          ],
          rows: lines.map((l) => ({ label: label(l), amount: l.amount })),
        },
      ]);
      return xlsxResponse(buffer, `${type}-${period}.xlsx`);
    }
    const buffer = await renderPdf({
      title: stmt.title,
      subtitle: `${stmt.clientName} · Periode ${stmt.period}`,
      tables: [
        {
          columns: [
            { header: "Keterangan", ratio: 3.2 },
            { header: "Jumlah (Rp)", align: "right", ratio: 1.8 },
          ],
          rows: lines.map((l) => [label(l), l.amount]),
        },
      ],
    });
    return pdfResponse(buffer, `${type}-${period}.pdf`);
  }

  return NextResponse.json({ data: stmt });
});
