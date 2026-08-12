import { NextResponse } from "next/server";
import { validatePortalToken } from "@/server/portal";
import { prisma } from "@/lib/db";
import { getTrialBalance } from "@/server/trial-balance";
import { getTaxLines } from "@/server/tax-report";
import { buildWorksheet } from "@/server/worksheet";
import { buildIncomeStatement, buildBalanceSheet, buildEquityStatement, buildCashFlowStatement } from "@/server/financial-statements";
import { buildAnalysis } from "@/server/financial-analysis";
import { buildCalk } from "@/server/calk";
import { buildTaxAnalysis } from "@/server/tax-analysis";

type Ctx = { params: Promise<{ token: string }> };

/**
 * GET /api/portal/[token]/financial?period=YYYY-MM
 * Paritas laporan dengan sisi akuntan — HANYA periode yang sudah dikunci (CLOSED/FINALIZED).
 */
export async function GET(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await validatePortalToken(token);
  if (!result) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });

  const { client } = result;
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? undefined;

  // Periode tersedia untuk klien: hanya CLOSED
  const periods = await prisma.fiscalPeriod.findMany({
    where: { clientId: client.id, status: "CLOSED" },
    orderBy: { period: "desc" },
    select: { period: true },
  });
  const available = periods.map((p) => p.period);
  const effective = period && available.includes(period) ? period : (available[0] ?? null);
  if (!effective) {
    return NextResponse.json({ error: "Belum ada periode terkunci. Laporan tersedia setelah akuntan mengunci periode." }, { status: 404 });
  }

  const clientFull = await prisma.client.findUnique({ where: { id: client.id }, select: { id: true, name: true, industry: true, taxId: true } });
  if (!clientFull) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const tb = await getTrialBalance(clientFull.id, clientFull.name, effective);
  if (!tb) return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
  const taxLines = await getTaxLines(clientFull.id, effective);
  const profileSubset = { legalName: clientFull.name, industry: clientFull.industry, taxId: clientFull.taxId };

  const labaRugi = buildIncomeStatement(tb.rows, clientFull.name, effective);
  const laba = labaRugi.lines.find((l) => l.label.includes("LABA (RUGI)"))?.amount ?? 0;
  const neraca = buildBalanceSheet(tb.rows, clientFull.name, effective, laba);
  const ekuitas = buildEquityStatement(tb.rows, clientFull.name, effective, laba);
  const arusKas = buildCashFlowStatement(tb.rows, clientFull.name, effective);

  return NextResponse.json({
    data: {
      clientName: clientFull.name,
      period: effective,
      availablePeriods: available,
      worksheet: buildWorksheet(tb.rows, clientFull.name, effective, null),
      statements: { labaRugi, neraca, ekuitas, arusKas },
      analysis: buildAnalysis(tb.rows, clientFull.name, effective),
      calk: buildCalk({ clientName: clientFull.name, period: effective, rows: tb.rows, profile: profileSubset }),
      taxAnalysis: buildTaxAnalysis(clientFull.name, effective, taxLines, tb.rows),
    },
  });
}
