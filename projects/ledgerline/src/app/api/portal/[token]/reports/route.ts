import { NextResponse } from "next/server";
import { validatePortalToken } from "@/server/portal";
import { generateReportCsv, generateReportPdf, generateReportXlsx, getClientJournals } from "@/server/reports";

type Ctx = { params: Promise<{ token: string }> };

const ALLOWED_FORMATS = ["pdf", "csv", "xlsx"] as const;
type ReportFormat = (typeof ALLOWED_FORMATS)[number];

const MIME: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** GET /api/portal/[token]/reports?format=pdf|csv|xlsx&start=YYYY-MM-DD&end=YYYY-MM-DD */
export async function GET(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await validatePortalToken(token);
  if (!result) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });

  const { client } = result;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "pdf";

  if (!(ALLOWED_FORMATS as readonly string[]).includes(format)) {
    return NextResponse.json({ error: `format harus salah satu dari: ${ALLOWED_FORMATS.join(", ")}` }, { status: 400 });
  }

  const startStr = url.searchParams.get("start") ?? undefined;
  const endStr = url.searchParams.get("end") ?? undefined;
  const startDate = startStr ? new Date(startStr) : undefined;
  const endDate = endStr ? new Date(endStr) : undefined;

  if ((startStr && isNaN(startDate!.getTime())) || (endStr && isNaN(endDate!.getTime()))) {
    return NextResponse.json({ error: "Format tanggal: YYYY-MM-DD" }, { status: 400 });
  }

  const journals = await getClientJournals(client.id, startDate, endDate);

  let body: Buffer | string;
  let filename: string;

  switch (format as ReportFormat) {
    case "pdf": {
      body = await generateReportPdf(journals, client.name);
      filename = `laporan-${client.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      break;
    }
    case "csv": {
      body = generateReportCsv(journals);
      filename = `jurnal-${client.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
      break;
    }
    case "xlsx": {
      body = generateReportXlsx(journals);
      filename = `laporan-${client.name.toLowerCase().replace(/\s+/g, "-")}.xlsx`;
      break;
    }
    default:
      return NextResponse.json({ error: "Format tidak didukung" }, { status: 400 });
  }

  return new NextResponse(body as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": MIME[format as ReportFormat],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
