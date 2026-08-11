import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { setMutationMatch } from "@/server/recon";

type Ctx = { params: Promise<{ id: string; mutationId: string }> };

/**
 * PATCH /api/clients/[id]/recon/mutations/[mutationId]
 * Body: { matchedJournalId: string | null } — pasang/lepas match (manual).
 */
export const PATCH = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id, mutationId } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { matchedJournalId?: string | null } | null;
  if (!body) return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });

  try {
    const updated = await setMutationMatch(
      mutationId,
      guard.session.user.firmId,
      client.id,
      body.matchedJournalId ?? null,
      true,
    );
    return NextResponse.json({ data: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
});
