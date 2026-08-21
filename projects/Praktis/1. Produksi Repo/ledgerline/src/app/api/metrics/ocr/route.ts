import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { getOcrMetrics } from "@/server/metrics";

/**
 * GET /api/metrics/ocr?days=30 — metrik OCR hybrid (lokal vs vision fallback),
 * estimasi token & biaya. Admin/Senior.
 */
export const GET = withTenantApi(async (req) => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "30", 10) || 30, 90);
  const summary = await getOcrMetrics(guard.session.user.firmId, days);

  return NextResponse.json({ data: summary });
});
