import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getTaxSummary, getSpt1771Data } from "@/server/tax-report";
import {
  buildEBupotCsv,
  buildPPh21Csv,
  buildPPh42Csv,
  buildSpt1111Csv,
  buildSpt1771,
  TAX_CODE_CATALOG,
  inferTaxCode,
} from "@/server/tax";
import { buildEBupotXml, buildEfakturXml, type TaxLineForXml } from "@/server/tax-xml";

type Ctx = { params: Promise<{ id: string }> };

const TYPES = ["spt1111", "spt1771", "ebupot23", "pph42", "pph21", "efaktur-xml", "ebupot-xml"] as const;
type ExportType = (typeof TYPES)[number];

const FILENAMES: Record<ExportType, string> = {
  spt1111: "spt-1111-ppn",
  spt1771: "spt-1771-rekonsiliasi",
  ebupot23: "ebupot-pph23",
  pph42: "pph-4-2",
  pph21: "pph-21-masa",
  "efaktur-xml": "efaktur-ppn",
  "ebupot-xml": "ebupot-pph23-42",
};

/** GET /api/clients/[id]/tax/export?period=&type=spt1111|spt1771|ebupot23|pph42|pph21 */
export const GET = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true, name: true, taxId: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? undefined;
  const type = url.searchParams.get("type") ?? "spt1111";
  if (!period) return NextResponse.json({ error: "Parameter period (YYYY-MM) wajib." }, { status: 400 });
  if (!(TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: `type harus salah satu dari: ${TYPES.join(", ")}` }, { status: 400 });
  }

  try {
    const summary = await getTaxSummary(client.id, client.name, period);

    // Export XML (e-Faktur / e-Bupot) — content-type application/xml
    if (type === "efaktur-xml" || type === "ebupot-xml") {
      const toXmlLines = (
        rows: { entryDate: string; journalDescription: string | null; taxCode: string | null; taxBase: number | null; debit: number; credit: number; accountCode: string; notes: string | null }[],
        amountOf: (l: { taxCode: string | null; taxBase: number | null; debit: number; credit: number }) => number,
      ): TaxLineForXml[] =>
        rows.map((r) => ({
          id: r.entryDate + r.taxCode + r.journalDescription,
          entryDate: r.entryDate,
          description: r.journalDescription,
          taxCode: r.taxCode ?? inferTaxCode(r.accountCode, r.notes),
          taxBase: r.taxBase ?? (r.debit > 0 ? r.debit : r.credit),
          amount: amountOf(r),
        }));

      let xml: string;
      let filename: string;
      if (type === "efaktur-xml") {
        const lines = toXmlLines(summary.ppnOut.rows as never[], (l) =>
          Math.round((l.taxBase ?? (l.debit > 0 ? l.debit : l.credit)) * 0.11 * 100) / 100,
        );
        xml = buildEfakturXml(lines, {
          npwp: client.taxId ?? "",
          nama: client.name,
          period,
          clientName: client.name,
        });
        filename = `${FILENAMES["efaktur-xml"]}-${period}.xml`;
      } else {
        const all = [...summary.pph23.rows, ...summary.pph42.rows];
        const lines = toXmlLines(all as never[], (l) => {
          const meta = TAX_CODE_CATALOG[l.taxCode ?? ""];
          return Math.round((l.taxBase ?? (l.debit > 0 ? l.debit : l.credit)) * (meta?.rate ?? 0) * 100) / 100;
        });
        xml = buildEBupotXml(lines, {
          npwp: client.taxId ?? "",
          nama: client.name,
          period,
          clientName: client.name,
        });
        filename = `${FILENAMES["ebupot-xml"]}-${period}.xml`;
      }

      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    let csv = "";

    switch (type as ExportType) {
      case "spt1111":
        csv = buildSpt1111Csv(summary, client.name);
        break;
      case "spt1771": {
        const { rows, assetCorrection } = await getSpt1771Data(client.id, client.name, period);
        csv = buildSpt1771(client.name, period, rows, { assetCorrection }).csv;
        break;
      }
      case "ebupot23":
        csv = buildEBupotCsv(summary, period);
        break;
      case "pph42":
        csv = buildPPh42Csv(summary, period);
        break;
      case "pph21":
        csv = buildPPh21Csv(summary, period);
        break;
      default:
        throw new Error("Tipe export tidak didukung.");
    }

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${FILENAMES[type as ExportType]}-${period}.csv"`,
      },
    });  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
});
