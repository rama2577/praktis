import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { describeJournal } from "@/server/ai-enrich";

/**
 * POST /api/journals/describe — generate deskripsi jurnal (entry) dari baris
 * via AI (fallback deterministik). Dipakai tombol "✨ AI" di form jurnal manual.
 * Body: { lines: [{accountName, debit, credit, notes?}], hint? }
 */
export const POST = withTenantApi(async (request) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = (await request.json().catch(() => null)) as {
    lines?: Array<{ accountName?: string; debit?: number; credit?: number; notes?: string | null }>;
    hint?: string;
  } | null;

  const lines = (body?.lines ?? [])
    .filter((l) => l && (l.debit || l.credit))
    .map((l) => ({
      accountName: l.accountName ?? "",
      debit: Number(l.debit ?? 0),
      credit: Number(l.credit ?? 0),
      notes: l.notes ?? null,
    }));

  if (lines.length === 0) {
    return NextResponse.json({ error: "Minimal satu baris dengan nominal." }, { status: 400 });
  }

  const result = await describeJournal(lines, body?.hint);
  return NextResponse.json({ data: result });
});
