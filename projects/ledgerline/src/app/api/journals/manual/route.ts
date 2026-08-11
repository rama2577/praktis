import { NextResponse } from "next/server";
import { JournalType, Role } from "@prisma/client";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import {
  ManualJournalError,
  createManualJournal,
  listManualJournals,
  validateManualJournalInput,
} from "@/server/manual-journal";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.SENIOR, Role.PARTNER];

/**
 * POST /api/journals/manual — buat jurnal manual / jurnal penyesuaian.
 * Body: { clientId, entryDate?, description, journalType?: "MANUAL"|"ADJUSTING", lines: [...] }.
 * Hanya ADMIN/SENIOR/PARTNER; jurnal langsung APPROVED + tercatat ActivityLog.
 */
export const POST = withTenantApi(async (request) => {
  const guard = await requireRoleApi(WRITE_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const body = (await request.json().catch(() => null)) as {
    clientId?: string;
    entryDate?: string;
    description?: string;
    journalType?: string;
    lines?: unknown[];
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const parsed = validateManualJournalInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const journalType = body.journalType === "ADJUSTING" ? JournalType.ADJUSTING : JournalType.MANUAL;

  try {
    const journal = await createManualJournal({
      firmId: guard.session.user.firmId,
      clientId: parsed.clientId,
      entryDate: parsed.entryDate,
      description: parsed.description,
      lines: parsed.lines,
      createdBy: guard.session.user.id,
      journalType,
    });
    return NextResponse.json(
      {
        data: {
          id: journal.id,
          clientId: journal.clientId,
          description: journal.description,
          journalType: journal.journalType,
          status: journal.status,
          entryDate: journal.entryDate,
          lineCount: journal.lines.length,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof ManualJournalError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
});

/**
 * GET /api/journals/manual?clientId=&from=&to= — daftar jurnal manual & penyesuaian.
 */
export const GET = withTenantApi(async (request) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const from = fromRaw && !Number.isNaN(new Date(fromRaw).getTime()) ? new Date(fromRaw) : undefined;
  const to = toRaw && !Number.isNaN(new Date(toRaw).getTime()) ? new Date(toRaw) : undefined;

  const journals = await listManualJournals({
    firmId: guard.session.user.firmId,
    clientId,
    from,
    to,
  });

  return NextResponse.json({
    data: journals.map((j) => ({
      id: j.id,
      client: j.client,
      description: j.description,
      journalType: j.journalType,
      status: j.status,
      entryDate: j.entryDate,
      createdAt: j.createdAt,
      lines: j.lines.map((l) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.debit.toString(),
        credit: l.credit.toString(),
        psakRef: l.psakRef,
      })),
    })),
  });
});
