import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoleApi } from "@/lib/rbac";
import { learnMappingFromText } from "@/server/client-profile";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/clients/[id]/profile/learn — belajar mapping dari daftar akun klien
 * (teks hasil upload COA klien). GLM-4-Flash (gratis) → status REVIEW.
 */
export const POST = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi([Role.ADMIN, Role.PARTNER, Role.SENIOR]);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;

  const client = await prisma.client.findFirst({ where: { id, firmId: guard.session.user.firmId } });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { rawAccountList?: string; sourcePeriod?: string };
  if (!body.rawAccountList || body.rawAccountList.trim().length < 10) {
    return NextResponse.json({ error: "rawAccountList wajib (daftar akun klien)" }, { status: 400 });
  }

  try {
    const profile = await learnMappingFromText({
      clientId: id,
      firmId: guard.session.user.firmId,
      rawAccountList: body.rawAccountList,
      sourcePeriod: body.sourcePeriod,
      updatedById: guard.session.user.id,
    });
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
});
