/**
 * GET/POST /api/clients/[id]/report-snapshots
 * List snapshots (GET) or transition status (POST with action).
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { getReportSnapshots, submitForReview, approveSnapshot, deliverSnapshot, rejectSnapshot } from "@/server/signoff";

type Ctx = { params: Promise<{ id: string }> };

// ── GET: list semua snapshot ──
export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id: clientId } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);

  const snaps = await getReportSnapshots(clientId, period);
  return NextResponse.json({ data: snaps });
});

// ── POST: transition status ──
export const POST = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id: clientId } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const { snapshotId, action, notes } = body as { snapshotId?: string; action?: string; notes?: string };

  if (!snapshotId || !action) {
    return NextResponse.json({ error: "snapshotId dan action wajib diisi" }, { status: 400 });
  }

  const userId = guard.session.user.id; // dari session auth
  let result;

  switch (action) {
    case "submit":
      result = await submitForReview(snapshotId, userId);
      break;
    case "approve":
      result = await approveSnapshot(snapshotId, userId);
      break;
    case "deliver":
      result = await deliverSnapshot(snapshotId);
      break;
    case "reject":
      result = await rejectSnapshot(snapshotId, notes);
      break;
    default:
      return NextResponse.json({ error: `Action tidak dikenal: ${action}` }, { status: 400 });
  }

  return NextResponse.json({ data: result });
});
