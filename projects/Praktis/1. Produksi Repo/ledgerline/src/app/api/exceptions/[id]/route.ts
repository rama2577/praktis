import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { detectBusinessEvent, EVENT_RULE_LABELS } from "@/ai/rule-engine";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/exceptions/[id] — detail one-screen (EN-06):
 * jurnal exception + dokumen sumber + draft baris AI + aturan yang dipakai.
 */
export const GET = withTenantApi<Ctx>(async (_req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const row = await prisma.journalEntry.findFirst({
    where: { id, firmId: guard.session.user.firmId, status: "EXCEPTION" },
    include: {
      client: { select: { id: true, name: true } },
      document: {
        select: { id: true, fileName: true, type: true, mimeType: true, sizeBytes: true, createdAt: true },
      },
      lines: {
        select: { accountCode: true, accountName: true, debit: true, credit: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!row) return NextResponse.json({ error: "Exception tidak ditemukan" }, { status: 404 });

  // Aturan terbaik dari teks yang tersedia (re-deteksi deterministik untuk tampilan)
  const textForRule = [row.description, row.exceptionFlag, row.document?.fileName ?? ""].filter(Boolean).join(" ");
  const detected = detectBusinessEvent(textForRule, row.document?.type ?? "");
  const rule = detected
    ? {
        kind: detected.kind,
        ...EVENT_RULE_LABELS[detected.kind],
        score: Math.round(detected.score * 100),
      }
    : null;

  return NextResponse.json({
    data: {
      id: row.id,
      clientId: row.client.id,
      clientName: row.client.name,
      description: row.description,
      exceptionFlag: row.exceptionFlag,
      confidence: row.confidence,
      journalType: row.journalType,
      entryDate: row.entryDate.toISOString(),
      createdAt: row.createdAt.toISOString(),
      document: row.document
        ? {
            id: row.document.id,
            fileName: row.document.fileName,
            type: row.document.type,
            mimeType: row.document.mimeType,
            sizeBytes: row.document.sizeBytes,
            createdAt: row.document.createdAt.toISOString(),
          }
        : null,
      lines: row.lines.map((l) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: Number(l.debit),
        credit: Number(l.credit),
      })),
      rule,
    },
  });
});
