/**
 * GET /api/clients/[id]/subledgers/[code]/ledger — buku besar pembantu.
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { getSubledgerLedger } from "@/server/subledger";

type Ctx = { params: Promise<{ id: string; code: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const params = ctx.params;
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id, code } = await params;
  const rows = await getSubledgerLedger(id, decodeURIComponent(code));
  return NextResponse.json({ data: rows });
});
