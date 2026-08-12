/**
 * GET /api/clients/[id]/management-letter?period=2026-08&format=json|md|csv
 * Management Letter — surat kepada manajemen (Big 4 standard).
 * Pure data: trial balance + analysis + quality metrics.
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getTrialBalance } from "@/server/trial-balance";
import { buildAnalysis } from "@/server/financial-analysis";
import { getQualityMetrics } from "@/server/metrics";
import { buildManagementLetter, managementLetterMarkdown, managementLetterCsv } from "@/server/management-letter";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id: clientId } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
  const format = searchParams.get("format") ?? "json";

  const client = await prisma.client.findFirst({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const tb = await getTrialBalance(clientId, client.name, period);
  if (!tb) return NextResponse.json({ error: "Tidak ada data trial balance" }, { status: 404 });

  const rows = tb.rows;
  const analysis = buildAnalysis(rows, client.name, period);

  // Quality metrics
  const qualityMetrics = await getQualityMetrics(client.firmId).catch(() => null);

  // Unresolved review tasks as "exceptions"
  const reviewTasks = await prisma.reviewTask.findMany({
    where: { status: { in: ["PENDING", "REJECTED"] }, journalEntry: { clientId } },
    orderBy: { createdAt: "desc" },
    take: 10,
  }).catch(() => []);

  const exceptions = reviewTasks.map((t: any) => ({
    accountName: t.accountCode ?? "",
    reason: t.note ?? t.aiSuggestion ?? "",
    status: t.status === "REJECTED" ? "OPEN" : "IN_REVIEW",
  }));

  // SLA breaches
  const slaBreaches = qualityMetrics?.stageBreachRates
    ? qualityMetrics.stageBreachRates
        .filter((b) => b.rate > 10)
        .map((b) => ({ stage: b.stage, count: b.breached, rate: b.rate }))
    : [];

  const ml = buildManagementLetter({
    clientName: client.name,
    period,
    preparedFor: `Manajemen ${client.name}`,
    preparedBy: "Tim Akuntan Praktis",
    rows,
    analysis,
    qualityMetrics,
    exceptions,
    slaBreaches: slaBreaches as any,
  });

  if (format === "md") {
    return new NextResponse(managementLetterMarkdown(ml), {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }
  if (format === "csv") {
    return new NextResponse(managementLetterCsv(ml), {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }
  return NextResponse.json({ data: ml });
});
