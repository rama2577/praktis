/**
 * POST /api/clients/import/worksheet
 * Import kertas kerja Excel (sheet Akun + Jurnal) menjadi klien baru.
 * - mode=preview (default): parse & validasi, TANPA menulis ke DB.
 * - mode=commit: parse → buat Client + ClientProfile.coaMapping + jurnal
 *   (opening balance + jurnal historis, status APPROVED/MANUAL) → hasil.
 *
 * Body (multipart): file=..., mode=preview|commit, clientName?, industry?
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { parseWorksheet, buildOpeningJournals } from "@/server/worksheet-import";
import type { ImportJournal } from "@/server/worksheet-import";

import { INDUSTRY_LIST, isIndustry } from "@/lib/industries";
const INDUSTRIES = INDUSTRY_LIST;

async function persistImport(
  firmId: string,
  result: Awaited<ReturnType<typeof parseWorksheet>>,
  opts: { clientName?: string; industry?: string },
) {
  const industry: "SERVICES" | "MANUFACTURING" | "CONSTRUCTION" | "EVENT" =
    opts.industry === "MANUFACTURING" ? "MANUFACTURING"
    : opts.industry === "CONSTRUCTION" ? "CONSTRUCTION"
    : opts.industry === "EVENT" ? "EVENT"
    : "SERVICES";
  const name = (opts.clientName ?? result.clientName ?? "Klien Import").trim();
  const year = result.year ?? new Date().getFullYear();

  const client = await prisma.client.create({
    data: { firmId, name, industry: industry },
  });

  // Simpan COA hasil import sebagai coaMapping klien (referensi AI + mapping).
  const coaMap: Record<string, { accountCode: string; accountName: string; posLaporan: string }> = {};
  for (const c of result.coa) {
    coaMap[c.code] = { accountCode: c.code, accountName: c.name, posLaporan: c.posLaporan };
  }
  await prisma.clientProfile.create({
    data: {
      clientId: client.id,
      firmId,
      coaMapping: coaMap,
      mappingStatus: "READY",
      sourcePeriod: `${year}-01`,
      rules: { importSource: "worksheet-excel", subledger: result.subledgerCodes.length },
    },
  });

  // Master subledger dari sheet Kode (CT-* pelanggan, AP-* pemasok, SH-* saham).
  const subledgerType = (code: string, group: string): "CUSTOMER" | "VENDOR" | "SHAREHOLDER" | "OTHER" => {
    if (group.toLowerCase().includes("hutang") || code.startsWith("AP-")) return "VENDOR";
    if (group.toLowerCase().includes("piutang") || code.startsWith("CT-")) return "CUSTOMER";
    if (code.startsWith("SH-")) return "SHAREHOLDER";
    return "OTHER";
  };
  if (result.subledgerCodes.length > 0) {
    await prisma.subledger.createMany({
      data: result.subledgerCodes.map((s) => ({
        firmId,
        clientId: client.id,
        code: s.code,
        name: s.name,
        type: subledgerType(s.code, s.group),
        openingBalance: s.openingBalance,
      })),
    });
  }

  // Jurnal: opening balance + jurnal historis (batch 20, status APPROVED agar masuk laporan).
  const allJournals: ImportJournal[] = [...buildOpeningJournals(result.coa, year), ...result.journals];
  let journalCreated = 0;
  for (let i = 0; i < allJournals.length; i += 20) {
    const batch = allJournals.slice(i, i + 20);
    await Promise.all(
      batch.map(async (j) => {
        await prisma.journalEntry.create({
          data: {
            firmId,
            clientId: client.id,
            status: "APPROVED",
            confidence: 1,
            description: j.keterangan || j.bukti || "Import kertas kerja",
            createdByAi: false,
            journalType: "MANUAL",
            entryDate: new Date(j.date),
            lines: {
              create: j.lines.map((l) => ({
                accountCode: l.code,
                accountName: l.name,
                debit: l.debit,
                credit: l.credit,
                notes: j.bukti || null,
                dimension: l.subledgerCode ? { subledgerCode: l.subledgerCode } : undefined,
              })),
            },
          },
        });
        journalCreated++;
      }),
    );
  }

  return { clientId: client.id, clientName: name, journalCreated, coaImported: result.coa.length };
}

export const POST = withTenantApi(async (request) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const form = await request.formData();
  const file = form.get("file");
  const mode = String(form.get("mode") ?? "preview");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File wajib diunggah (XLSX)" }, { status: 400 });
  }
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return NextResponse.json({ error: "Format harus .xlsx" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let result;
  try {
    result = await parseWorksheet(buffer);
  } catch (e) {
    return NextResponse.json({ error: `Gagal membaca file: ${(e as Error).message}` }, { status: 422 });
  }

  if (mode === "commit") {
    const clientName = String(form.get("clientName") ?? "").trim() || undefined;
    const industry = String(form.get("industry") ?? "").trim() || undefined;
    try {
      const saved = await persistImport(guard.session.user.firmId, result, { clientName, industry });
      return NextResponse.json({ ok: true, ...saved });
    } catch (e) {
      return NextResponse.json({ error: `Gagal menyimpan: ${(e as Error).message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, mode: "preview", result });
});
