/**
 * GET /api/clients/[id]/monthly-matrix?year=2026
 * Matrix 12 bulan: Laba Rugi per bulan + Neraca posisi akhir bulan (kumulatif).
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { prisma } from "@/lib/db";
import { getMonthlyMatrix } from "@/server/monthly-matrix";
import { renderPdf, pdfResponse, xlsxBuffer, xlsxResponse, csvResponse } from "@/server/export";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;
  const year = parseInt(request.nextUrl.searchParams.get("year") ?? "", 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Parameter year wajib (YYYY)" }, { status: 400 });
  }
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { name: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  const data = await getMonthlyMatrix(id, client.name, year);

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const cols = [
    { header: "Bulan", key: "bulan", width: 12 },
    { header: "Pendapatan", key: "pendapatan", width: 18 },
    { header: "Beban", key: "beban", width: 18 },
    { header: "Laba", key: "laba", width: 18 },
    { header: "Laba YTD", key: "labaKumulatif", width: 18 },
    { header: "Aset", key: "aset", width: 18 },
    { header: "Liabilitas", key: "liabilitas", width: 18 },
    { header: "Ekuitas", key: "ekuitas", width: 18 },
  ];
  const sheetRows = data.months.map((m) => ({
    bulan: m.period,
    pendapatan: m.pendapatan,
    beban: m.beban,
    laba: m.laba,
    labaKumulatif: m.labaKumulatif,
    aset: m.aset,
    liabilitas: m.liabilitas,
    ekuitas: m.ekuitas,
  }));

  if (format === "csv") {
    const csv =
      "Bulan,Pendapatan,Beban,Laba,Laba YTD,Aset,Liabilitas,Ekuitas\n" +
      data.months
        .map((m) =>
          [m.period, m.pendapatan, m.beban, m.laba, m.labaKumulatif, m.aset, m.liabilitas, m.ekuitas].join(","),
        )
        .join("\n") +
      `\nTOTAL,,${data.totals.pendapatan},${data.totals.beban},${data.totals.laba},,${data.totals.aset},${data.totals.liabilitas},${data.totals.ekuitas}`;
    return csvResponse(csv, `matrix-12-bulan-${year}.csv`);
  }

  if (format === "xlsx") {
    const buffer = await xlsxBuffer([
      {
        name: "Matrix 12 Bulan",
        columns: cols,
        rows: [
          ...sheetRows,
          {
            bulan: "TOTAL",
            pendapatan: data.totals.pendapatan,
            beban: data.totals.beban,
            laba: data.totals.laba,
            labaKumulatif: data.totals.laba,
            aset: data.totals.aset,
            liabilitas: data.totals.liabilitas,
            ekuitas: data.totals.ekuitas,
          },
        ],
      },
    ]);
    return xlsxResponse(buffer, `matrix-12-bulan-${year}.xlsx`);
  }

  if (format === "pdf") {
    const buffer = await renderPdf({
      title: `Matrix 12 Bulan — ${data.clientName}`,
      subtitle: `Tahun ${data.year}`,
      tables: [
        {
          columns: [
            { header: "Bulan", ratio: 1.2 },
            { header: "Pendapatan", align: "right", ratio: 1.3 },
            { header: "Beban", align: "right", ratio: 1.3 },
            { header: "Laba", align: "right", ratio: 1.3 },
            { header: "Laba YTD", align: "right", ratio: 1.3 },
            { header: "Aset", align: "right", ratio: 1.3 },
            { header: "Liabilitas", align: "right", ratio: 1.3 },
            { header: "Ekuitas", align: "right", ratio: 1.3 },
          ],
          rows: data.months.map((m) => [
            m.period,
            m.pendapatan,
            m.beban,
            m.laba,
            m.labaKumulatif,
            m.aset,
            m.liabilitas,
            m.ekuitas,
          ]),
          footer: [
            `Total tahun: Pendapatan ${data.totals.pendapatan.toLocaleString("id-ID")} · Beban ${data.totals.beban.toLocaleString("id-ID")} · Laba ${data.totals.laba.toLocaleString("id-ID")}`,
            `Posisi akhir: Aset ${data.totals.aset.toLocaleString("id-ID")} · Liabilitas ${data.totals.liabilitas.toLocaleString("id-ID")} · Ekuitas ${data.totals.ekuitas.toLocaleString("id-ID")}`,
          ],
        },
      ],
    });
    return pdfResponse(buffer, `matrix-12-bulan-${year}.pdf`);
  }

  return NextResponse.json({ data });
});
