import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { getLedger, getLedgerAllAccounts, ledgerCsv, ledgerXlsx } from "@/server/ledger";
import { renderPdf, pdfResponse } from "@/server/export";
import { parsePeriod } from "@/server/trial-balance";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]/ledger?accountCode=1-1100&period=2026-08
 * Buku besar satu akun per periode (tenant-scoped; jurnal APPROVED/FINALIZED).
 */
export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const accountCode = searchParams.get("accountCode") ?? "";
  const period = searchParams.get("period") ?? "";

  if (!parsePeriod(period)) {
    return NextResponse.json({ error: "Periode tidak valid. Gunakan format YYYY-MM." }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true, name: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });
  }

  // Mode seluruh akun: tanpa accountCode → ringkasan semua akun per periode.
  if (!accountCode.trim()) {
    const all = await getLedgerAllAccounts(client.id, client.name, period);
    return NextResponse.json({ data: all });
  }

  const report = await getLedger(client.id, client.name, accountCode.trim(), period);

  const format = searchParams.get("format") ?? "json";
  if (format === "csv") {
    return new NextResponse("\uFEFF" + ledgerCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="buku-besar-${accountCode.trim()}-${period}.csv"`,
      },
    });
  }
  if (format === "xlsx") {
    const buffer = await ledgerXlsx(report);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="buku-besar-${accountCode.trim()}-${period}.xlsx"`,
      },
    });
  }
  if (format === "pdf") {
    const buffer = await renderPdf({
      title: `Buku Besar — ${report.accountName}`,
      subtitle: `${client.name} · Periode ${period} · ${report.accountCode}`,
      tables: [
        {
          columns: [
            { header: "Tanggal", ratio: 1.2 },
            { header: "Referensi", ratio: 1.2 },
            { header: "Deskripsi", ratio: 2.6 },
            { header: "Debit", align: "right", ratio: 1.4 },
            { header: "Kredit", align: "right", ratio: 1.4 },
            { header: "Saldo", align: "right", ratio: 1.4 },
          ],
          rows: report.entries.map((e) => [
            e.entryDate.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }),
            e.reference,
            e.description ?? "",
            e.debit,
            e.credit,
            e.balance,
          ]),
          footer: [
            `Total Debit: ${report.totalDebit.toLocaleString("id-ID")}   ·   Total Kredit: ${report.totalCredit.toLocaleString("id-ID")}`,
            `Saldo Akhir: ${report.closingBalance.toLocaleString("id-ID")}`,
          ],
        },
      ],
    });
    return pdfResponse(buffer, `buku-besar-${accountCode.trim()}-${period}.pdf`);
  }

  return NextResponse.json({ data: report });
});
