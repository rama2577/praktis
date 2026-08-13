import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { listClients, validateClientInput } from "@/server/clients";

/** GET /api/clients — daftar klien (ADMIN/SENIOR) */
export const GET = withTenantApi(async () => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }
  const clients = await listClients(guard.session.user.firmId);
  return NextResponse.json({ data: clients });
});

/** POST /api/clients — tambah klien (ADMIN/SENIOR) */
export const POST = withTenantApi(async (request) => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const body = await request.json().catch(() => null);
  const result = validateClientInput(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      firmId: guard.session.user.firmId,
      name: result.data.name,
      industry: result.data.industry as "RETAIL" | "SERVICES" | "FNB",
      taxId: result.data.taxId ?? undefined,
    },
  });

  // Gap #2: isi coaMapping klien dari template COA industri —
  // AI langsung punya referensi akun klien sejak hari pertama.
  const { coaMappingFromTemplate } = await import("@/server/coa-template");
  const coaMapping = await coaMappingFromTemplate(result.data.industry);
  if (Object.keys(coaMapping).length > 0) {
    await prisma.clientProfile.create({
      data: {
        clientId: client.id,
        firmId: guard.session.user.firmId,
        coaMapping,
        mappingStatus: "READY",
        rules: { source: "industry-template", template: result.data.industry },
      },
    });
  }

  return NextResponse.json({ data: client }, { status: 201 });
});
