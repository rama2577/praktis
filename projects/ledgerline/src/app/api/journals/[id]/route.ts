import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { EDIT_JOURNAL_ROLES, OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { reclassJournal, type ReclassLine } from "@/server/ledger";
import { ManualJournalError } from "@/server/manual-journal";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/journals/[id] — detail jurnal (termasuk baris) untuk editor reclass.
 */
export const GET = withTenantApi<Ctx>(async (_request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await ctx.params;
  const journal = await prisma.journalEntry.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: {
      id: true,
      entryDate: true,
      description: true,
      journalType: true,
      status: true,
      lines: {
        select: { accountCode: true, accountName: true, debit: true, credit: true, notes: true },
      },
    },
  });
  if (!journal) {
    return NextResponse.json({ error: "Jurnal tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...journal,
      entryDate: journal.entryDate.toISOString(),
      lines: journal.lines.map((l) => ({
        ...l,
        debit: Number(l.debit),
        credit: Number(l.credit),
      })),
    },
  });
});

/**
 * PATCH /api/journals/[id] — reclass jurnal APPROVED (edit baris) selama
 * periode belum terkunci. Hanya SENIOR/PARTNER/ADMIN; audit trail tercatat.
 */
export const PATCH = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(EDIT_JOURNAL_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { lines?: ReclassLine[] } | null;
  const lines = body?.lines;
  if (!Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "Minimal 2 baris jurnal." }, { status: 400 });
  }

  try {
    const result = await reclassJournal({
      firmId: guard.session.user.firmId,
      journalId: id,
      lines,
      userId: guard.session.user.id,
    });
    return NextResponse.json({ data: result });
  } catch (e) {
    if (e instanceof ManualJournalError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
});
