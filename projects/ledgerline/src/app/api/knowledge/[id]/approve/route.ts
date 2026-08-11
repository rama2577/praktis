import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoleApi } from "@/lib/rbac";
import { withTenantApi } from "@/lib/tenant-api";
import { approveKnowledge } from "@/server/knowledge";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/knowledge/[id]/approve — setujui draf (Senior/Partner/Admin). */
export const POST = withTenantApi<Ctx>(async (_req, ctx) => {
  const guard = await requireRoleApi([Role.ADMIN, Role.PARTNER, Role.SENIOR]);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;
  try {
    const item = await approveKnowledge(id, guard.session.user.id);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
});
