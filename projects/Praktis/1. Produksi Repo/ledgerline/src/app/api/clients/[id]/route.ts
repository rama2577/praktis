import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { validateClientInput } from "@/server/clients";
import type { Industry } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/clients/[id] — ubah data klien atau ubah status aktif/nonaktif.
 * Body: { name?, industry?, taxId?, status? } — minimal satu field.
 */
export const PATCH = withTenantApi<Params>(async (request, ctx) => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
  });
  if (!client) {
    return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ errors: { _form: "Body tidak valid" } }, { status: 400 });
  }

  const hasData = "name" in body || "industry" in body || "taxId" in body;
  const hasStatus = "status" in body;

  if (!hasData && !hasStatus) {
    return NextResponse.json(
      { errors: { _form: "Tidak ada field yang diubah" } },
      { status: 400 },
    );
  }

  const data: { name?: string; industry?: Industry; taxId?: string | null } = {};
  if (hasData) {
    const result = validateClientInput({
      name: body.name ?? client.name,
      industry: body.industry ?? client.industry,
      taxId: body.taxId ?? client.taxId,
    });
    if (!result.ok) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }
    data.name = result.data.name;
    data.industry = result.data.industry as Industry;
    data.taxId = result.data.taxId;
  }

  if (hasStatus) {
    if (body.status !== "ACTIVE" && body.status !== "INACTIVE") {
      return NextResponse.json(
        { errors: { status: "Status harus ACTIVE atau INACTIVE" } },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...data,
      ...(hasStatus ? { status: body.status as "ACTIVE" | "INACTIVE" } : {}),
    },
  });

  return NextResponse.json({ data: updated });
});
