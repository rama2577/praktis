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
import { renderPdf, pdfResponse, xlsxBuffer, xlsxResponse } from "@/server/export";

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

  const exceptions = reviewTasks.map((t) => ({
    // TODO(QW-5): ReviewTask tidak punya accountCode — ambil dari journalEntry.accountCode
    // saat management letter di-upgrade (saat ini menghasilkan "" untuk semua baris).
    accountName: "",
    reason: t.note ?? "",
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
    slaBreaches,
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

  if (format === "pdf") {
    const buffer = await renderPdf({
      title: `Management Letter — ${client.name}`,
      subtitle: `Periode ${period} · ${ml.reference}`,
      tables: [
        {
          title: "Ringkasan Eksekutif",
          columns: [],
          rows: [],
          paragraphs: [ml.executiveSummary, ...ml.narrative],
        },
        {
          title: "Temuan Audit",
          columns: [
            { header: "Area", ratio: 1.4 },
            { header: "Judul", ratio: 2.2 },
            { header: "Severity", ratio: 1.1 },
            { header: "Status", ratio: 1.3 },
            { header: "Rekomendasi", ratio: 2.6 },
          ],
          rows: ml.findings.map((f) => [
            f.area,
            f.title,
            f.severity,
            f.status,
            f.recommendation,
          ]),
          footer: [
            `Temuan: ${ml.summary.total} (High ${ml.summary.high} · Medium ${ml.summary.medium} · Low ${ml.summary.low} · Observasi ${ml.summary.observation}) · Resolved ${ml.summary.resolved}`,
          ],
        },
      ],
    });
    return pdfResponse(buffer, `management-letter-${period}.pdf`);
  }

  if (format === "xlsx") {
    const buffer = await xlsxBuffer([
      {
        name: "Temuan",
        columns: [
          { header: "Area", key: "area", width: 18 },
          { header: "Judul", key: "title", width: 40 },
          { header: "Severity", key: "severity", width: 12 },
          { header: "Status", key: "status", width: 14 },
          { header: "Deskripsi", key: "description", width: 48 },
          { header: "Dampak", key: "impact", width: 36 },
          { header: "Rekomendasi", key: "recommendation", width: 48 },
        ],
        rows: ml.findings.map((f) => ({
          area: f.area,
          title: f.title,
          severity: f.severity,
          status: f.status,
          description: f.description,
          impact: f.impact,
          recommendation: f.recommendation,
        })),
      },
      {
        name: "Ringkasan",
        columns: [
          { header: "Keterangan", key: "label", width: 28 },
          { header: "Jumlah", key: "value", width: 12 },
        ],
        rows: [
          { label: "High", value: ml.summary.high },
          { label: "Medium", value: ml.summary.medium },
          { label: "Low", value: ml.summary.low },
          { label: "Observasi", value: ml.summary.observation },
          { label: "Total", value: ml.summary.total },
          { label: "Resolved", value: ml.summary.resolved },
        ],
      },
    ]);
    return xlsxResponse(buffer, `management-letter-${period}.xlsx`);
  }

  return NextResponse.json({ data: ml });
});
