import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { coaAccountsFromMapping } from "@/server/manual-journal";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]/coa — daftar akun COA standar yang sudah dipetakan untuk klien.
 * Sumber: ClientProfile.coaMapping (tenant-scoped; klien harus milik firma pemanggil).
 */
export const GET = withTenantApi<Ctx>(async (_request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true, name: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });
  }

  const profile = await prisma.clientProfile.findUnique({
    where: { clientId: client.id },
    select: { coaMapping: true },
  });

  return NextResponse.json({
    data: {
      clientId: client.id,
      clientName: client.name,
      accounts: coaAccountsFromMapping(profile?.coaMapping),
    },
  });
});
