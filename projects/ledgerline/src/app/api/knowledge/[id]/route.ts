import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoleApi } from "@/lib/rbac";
import { withTenantApi } from "@/lib/tenant-api";
import { rejectKnowledge } from "@/server/knowledge";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/knowledge/[id] — tolak draf (Senior/Partner/Admin). */
export const PATCH = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi([Role.ADMIN, Role.PARTNER, Role.SENIOR]);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "reject") {
    return NextResponse.json({ error: "action harus 'reject'" }, { status: 400 });
  }
  try {
    const item = await rejectKnowledge(id);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
});
