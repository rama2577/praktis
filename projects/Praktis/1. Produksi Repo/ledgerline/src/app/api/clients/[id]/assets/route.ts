import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { createFixedAsset, getAssetRegister } from "@/server/assets";
import type { DepreciationMethod } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/clients/[id]/assets — register aset tetap klien. */
export const GET = withTenantApi<Ctx>(async (_req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const assets = await getAssetRegister(client.id);
  return NextResponse.json({ data: assets });
});

/** POST /api/clients/[id]/assets — daftarkan aset baru. */
export const POST = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    category?: string;
    purchaseDate?: string;
    purchaseCost?: number;
    residualValue?: number;
    method?: DepreciationMethod;
    commercialLifeMonths?: number;
    fiscalGroup?: string;
    notes?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });

  const purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
  if (!purchaseDate || isNaN(purchaseDate.getTime())) {
    return NextResponse.json({ error: "Tanggal perolehan tidak valid." }, { status: 400 });
  }

  try {
    const asset = await createFixedAsset({
      firmId: guard.session.user.firmId,
      clientId: client.id,
      name: body.name ?? "",
      category: body.category ?? "",
      purchaseDate,
      purchaseCost: Number(body.purchaseCost ?? 0),
      residualValue: Number(body.residualValue ?? 0),
      method: body.method ?? "STRAIGHT_LINE",
      commercialLifeMonths: Number(body.commercialLifeMonths ?? 0),
      fiscalGroup: body.fiscalGroup ?? "",
      notes: body.notes,
    });
    return NextResponse.json({ data: { id: asset.id, name: asset.name } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
});
