import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { enrichClientMaster } from "@/server/client-profile";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/clients/[id]/enrich — enrich master data klien (NPWP/industri/alamat)
 * dari teks dokumen referensi (referenceText) atau teks kiriman.
 * Body opsional: { text?: string }.
 */
export const POST = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { text?: string } | null;

  try {
    const result = await enrichClientMaster({
      clientId: id,
      firmId: guard.session.user.firmId,
      text: body?.text,
    });
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
});
