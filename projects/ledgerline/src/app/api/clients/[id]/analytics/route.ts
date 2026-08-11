import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getTrialBalance, parsePeriod } from "@/server/trial-balance";
import { getTaxLines } from "@/server/tax-report";
import { getClientProfile } from "@/server/client-profile";
import { buildAnalysis } from "@/server/financial-analysis";
import { buildCalk, calkMarkdown, calkCsv } from "@/server/calk";
import { buildTaxAnalysis } from "@/server/tax-analysis";
import { buildAnnualReport, annualReportMarkdown } from "@/server/annual-report";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]/analytics?period=2026-08&scope=analysis|calk|tax|annual&format=json|md|csv
 * Paket analisa laporan keuangan: rasio+grafik, CALK, analisa pajak (tax ratio),
 * dan penyampaian laporan gaya annual report.
 */
export const GET = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true, name: true, industry: true, taxId: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? undefined;
  const scope = url.searchParams.get("scope") ?? "analysis";
  const format = url.searchParams.get("format") ?? "json";
  if (!period) return NextResponse.json({ error: "Parameter period (YYYY-MM) wajib." }, { status: 400 });
  if (!parsePeriod(period)) return NextResponse.json({ error: "Periode tidak valid (YYYY-MM)." }, { status: 400 });

  const tb = await getTrialBalance(client.id, client.name, period);
  if (!tb) return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
  const [profile, taxLines, depMeta] = await Promise.all([
    getClientProfile(client.id),
    getTaxLines(client.id, period),
    prisma.fixedAsset.aggregate({ where: { clientId: client.id }, _count: true, _min: { method: true } }),
  ]);

  const profileSubset = profile
    ? { legalName: client.name, industry: client.industry, taxId: client.taxId }
    : { legalName: client.name, industry: client.industry, taxId: client.taxId };

  const calkInput = {
    clientName: client.name,
    period,
    rows: tb.rows,
    profile: profileSubset,
    depreciationMethod: depMeta._count > 0 ? depMeta._min.method : null,
    assetCount: depMeta._count,
  };

  if (scope === "calk") {
    const calk = buildCalk(calkInput);
    if (format === "md") {
      return new NextResponse(calkMarkdown(calk), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="calk-${period}.md"`,
        },
      });
    }
    if (format === "csv") {
      return new NextResponse("\uFEFF" + calkCsv(calk), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="calk-${period}.csv"`,
        },
      });
    }
    return NextResponse.json({ data: calk });
  }

  if (scope === "tax") {
    const tax = buildTaxAnalysis(client.name, period, taxLines, tb.rows);
    return NextResponse.json({ data: tax });
  }

  if (scope === "annual") {
    const report = buildAnnualReport({
      clientName: client.name,
      period,
      rows: tb.rows,
      taxLines,
      profile: profileSubset,
      depreciationMethod: depMeta._count > 0 ? depMeta._min.method : null,
      assetCount: depMeta._count,
    });
    if (format === "md") {
      return new NextResponse(annualReportMarkdown(report), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="penyampaian-laporan-${period}.md"`,
        },
      });
    }
    return NextResponse.json({ data: report });
  }

  const analysis = buildAnalysis(tb.rows, client.name, period);
  return NextResponse.json({ data: analysis });
});
