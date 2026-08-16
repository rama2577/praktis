/**
 * GET /api/clients/[id]/multi-period?periods=YYYY-MM,YYYY-MM,YYYY-MM
 * Mengembalikan ikhtisar keuangan multi-periode.
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getTrialBalance } from "@/server/trial-balance";
import { buildMultiPeriodHighlights } from "@/server/multi-period";
import { renderPdf, pdfResponse, xlsxBuffer, xlsxResponse, csvResponse } from "@/server/export";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id: clientId } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const periodsRaw = searchParams.get("periods");
  if (!periodsRaw) return NextResponse.json({ error: "Parameter periods wajib diisi" }, { status: 400 });

  const periodList = periodsRaw.split(",").map((p) => p.trim()).filter(Boolean);
  if (periodList.length === 0) return NextResponse.json({ error: "Minimal 1 periode" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const reports = await Promise.all(
    periodList.map((p) => getTrialBalance(clientId, client.name, p)),
  );

  const periodRanges = reports
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => ({ period: r.period, rows: r.rows }));

  if (periodRanges.length === 0) {
    return NextResponse.json({ error: "Tidak ada data untuk periode yang diminta" }, { status: 404 });
  }

  const highlights = buildMultiPeriodHighlights(client.name, periodRanges);

  const format = searchParams.get("format") ?? "json";
  const fmtRatio = (n: number | null) => (n == null ? "" : n.toFixed(2));

  if (format === "csv") {
    const header =
      "Periode,Penjualan Bersih,Laba Kotor,Laba Usaha,Laba Bersih,EBITDA,Total Aset,Total Liabilitas,Total Ekuitas,Current Ratio,GPM,OPM,NPM,ROA,ROE";
    const lines = highlights.periods.map((p) =>
      [
        p.period,
        p.penjualanBersih,
        p.labaKotor,
        p.labaUsaha,
        p.labaBersih,
        p.ebitda,
        p.totalAset,
        p.totalLiabilitas,
        p.totalEkuitas,
        fmtRatio(p.currentRatio),
        fmtRatio(p.gpm),
        fmtRatio(p.opm),
        fmtRatio(p.npm),
        fmtRatio(p.roa),
        fmtRatio(p.roe),
      ].join(","),
    );
    return csvResponse([header, ...lines].join("\n"), `ikhtisar-multi-periode.csv`);
  }

  if (format === "xlsx") {
    const buffer = await xlsxBuffer([
      {
        name: "Ikhtisar Multi Periode",
        columns: [
          { header: "Periode", key: "period", width: 10 },
          { header: "Penjualan Bersih", key: "penjualanBersih", width: 18 },
          { header: "Laba Kotor", key: "labaKotor", width: 16 },
          { header: "Laba Usaha", key: "labaUsaha", width: 16 },
          { header: "Laba Bersih", key: "labaBersih", width: 16 },
          { header: "EBITDA", key: "ebitda", width: 16 },
          { header: "Total Aset", key: "totalAset", width: 16 },
          { header: "Total Liabilitas", key: "totalLiabilitas", width: 16 },
          { header: "Total Ekuitas", key: "totalEkuitas", width: 16 },
          { header: "Current Ratio", key: "currentRatio", width: 12 },
          { header: "GPM", key: "gpm", width: 8 },
          { header: "OPM", key: "opm", width: 8 },
          { header: "NPM", key: "npm", width: 8 },
          { header: "ROA", key: "roa", width: 8 },
          { header: "ROE", key: "roe", width: 8 },
        ],
        rows: highlights.periods.map((p) => ({
          period: p.period,
          penjualanBersih: p.penjualanBersih,
          labaKotor: p.labaKotor,
          labaUsaha: p.labaUsaha,
          labaBersih: p.labaBersih,
          ebitda: p.ebitda,
          totalAset: p.totalAset,
          totalLiabilitas: p.totalLiabilitas,
          totalEkuitas: p.totalEkuitas,
          currentRatio: p.currentRatio ?? "",
          gpm: p.gpm ?? "",
          opm: p.opm ?? "",
          npm: p.npm ?? "",
          roa: p.roa ?? "",
          roe: p.roe ?? "",
        })),
      },
    ]);
    return xlsxResponse(buffer, `ikhtisar-multi-periode.xlsx`);
  }

  if (format === "pdf") {
    const buffer = await renderPdf({
      title: `Ikhtisar Multi Periode — ${highlights.clientName}`,
      subtitle: highlights.periods.map((p) => p.period).join("  ·  "),
      tables: [
        {
          title: "Laba Rugi",
          columns: [
            { header: "Periode", ratio: 1.5 },
            { header: "Penjualan", align: "right", ratio: 1.5 },
            { header: "Laba Kotor", align: "right", ratio: 1.4 },
            { header: "Laba Usaha", align: "right", ratio: 1.4 },
            { header: "Laba Bersih", align: "right", ratio: 1.4 },
            { header: "EBITDA", align: "right", ratio: 1.4 },
          ],
          rows: highlights.periods.map((p) => [p.period, p.penjualanBersih, p.labaKotor, p.labaUsaha, p.labaBersih, p.ebitda]),
        },
        {
          title: "Neraca",
          columns: [
            { header: "Periode", ratio: 1.7 },
            { header: "Total Aset", align: "right", ratio: 1.6 },
            { header: "Total Liabilitas", align: "right", ratio: 1.6 },
            { header: "Total Ekuitas", align: "right", ratio: 1.6 },
          ],
          rows: highlights.periods.map((p) => [p.period, p.totalAset, p.totalLiabilitas, p.totalEkuitas]),
        },
        {
          title: "Rasio",
          columns: [
            { header: "Periode", ratio: 1.7 },
            { header: "Current", align: "right", ratio: 1.0 },
            { header: "GPM", align: "right", ratio: 1.0 },
            { header: "OPM", align: "right", ratio: 1.0 },
            { header: "NPM", align: "right", ratio: 1.0 },
            { header: "ROA", align: "right", ratio: 1.0 },
            { header: "ROE", align: "right", ratio: 1.0 },
          ],
          rows: highlights.periods.map((p) => [
            p.period,
            fmtRatio(p.currentRatio),
            fmtRatio(p.gpm),
            fmtRatio(p.opm),
            fmtRatio(p.npm),
            fmtRatio(p.roa),
            fmtRatio(p.roe),
          ]),
        },
      ],
    });
    return pdfResponse(buffer, `ikhtisar-multi-periode.pdf`);
  }

  return NextResponse.json({ data: highlights });
});
