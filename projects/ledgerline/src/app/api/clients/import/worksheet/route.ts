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

const INDUSTRIES = ["RETAIL", "SERVICES", "FNB"] as const;

async function persistImport(
  firmId: string,
  result: Awaited<ReturnType<typeof parseWorksheet>>,
  opts: { clientName?: string; industry?: string },
) {
  const industry = (INDUSTRIES as readonly string[]).includes(opts.industry ?? "") ? opts.industry! : "SERVICES";
  const name = (opts.clientName ?? result.clientName ?? "Klien Import").trim();
  const year = result.year ?? new Date().getFullYear();

  const client = await prisma.client.create({
    data: { firmId, name, industry: industry as "SERVICES" },
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
            lines: { create: j.lines.map((l) => ({ accountCode: l.code, accountName: l.name, debit: l.debit, credit: l.credit, notes: j.bukti || null })) },
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
