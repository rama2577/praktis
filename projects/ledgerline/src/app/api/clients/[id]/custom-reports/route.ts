import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import {
  buildCustomReport,
  customReportCsv,
  getJournalLinesWithDimensions,
  listReportTemplates,
  type ReportTemplate,
} from "@/server/custom-report";
import { renderPdf, pdfResponse, xlsxBuffer, xlsxResponse } from "@/server/export";

type Ctx = { params: Promise<{ id: string }> };

const isKind = (v: unknown): v is ReportTemplate["kind"] =>
  typeof v === "string" && ["LABA_RUGI", "NERACA", "ARUS_KAS", "PENJUALAN", "BEBAN", "PENDAPATAN_PER_PROYEK", "BEBAN_PER_CHANNEL", "PENJUALAN_PER_CHANNEL"].includes(v);

/**
 * GET /api/clients/[id]/custom-reports?period=&templateId=
 * Template tersimpan + hasil jalankan laporan (data + CSV/JSON).
 * format=csv → unduh file CSV; tanpa templateId → daftar template.
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
  const period = url.searchParams.get("period");
  const templateId = url.searchParams.get("templateId");
  const format = url.searchParams.get("format") ?? "json";
  if (!period) return NextResponse.json({ error: "Parameter period (YYYY-MM) wajib." }, { status: 400 });

  const templates = await listReportTemplates(client.id);

  if (!templateId) {
    return NextResponse.json({ data: { clientName: client.name, period, templates } });
  }

  const template = templates.find((t) => t.id === templateId);
  if (!template) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
  if (!isKind(template.kind)) {
    return NextResponse.json({ error: "Jenis template tidak valid." }, { status: 400 });
  }

  const lines = await getJournalLinesWithDimensions(client.id, period);
  const result = buildCustomReport(lines, template.kind, template.dimensions, template.groupBy ?? null);

  if (format === "csv") {
    const csv = "\uFEFF" + customReportCsv(template, result.rows, period, client.name);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-${template.id}-${period}.csv"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await renderPdf({
      title: `Laporan ${template.name}`,
      subtitle: `${client.name} · Periode ${period} · ${template.kind}`,
      tables: [
        {
          columns: [
            { header: "Keterangan", ratio: 3.2 },
            { header: "Jumlah (Rp)", align: "right", ratio: 1.8 },
          ],
          rows: result.rows.map((r) => [r.label, r.amount]),
          footer: [`Total: ${result.total.toLocaleString("id-ID")}`],
        },
      ],
    });
    return pdfResponse(buffer, `laporan-${template.id}-${period}.pdf`);
  }

  if (format === "xlsx") {
    const buffer = await xlsxBuffer([
      {
        name: template.name,
        columns: [
          { header: "Keterangan", key: "label", width: 56 },
          { header: "Jumlah (Rp)", key: "amount", width: 22 },
        ],
        rows: [
          ...result.rows.map((r) => ({ label: r.label, amount: r.amount })),
          { label: "Total", amount: result.total },
        ],
      },
    ]);
    return xlsxResponse(buffer, `laporan-${template.id}-${period}.xlsx`);
  }

  return NextResponse.json({ data: { template, period, rows: result.rows, total: result.total, filteredLines: result.filteredLines } });
});
