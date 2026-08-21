/**
 * GET /api/clients/[id]/subledgers — daftar buku besar pembantu + saldo.
 * POST /api/clients/[id]/subledgers — buat master subledger manual.
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { prisma } from "@/lib/db";
import { listSubledgers } from "@/server/subledger";

const SUBLEDGER_TYPES = ["CUSTOMER", "VENDOR", "SHAREHOLDER", "OTHER"] as const;

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const params = ctx.params;
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await params;
  const type = request.nextUrl.searchParams.get("type");
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";
  const data = await listSubledgers(id, { type: type ?? undefined, includeInactive });
  return NextResponse.json({ data });
});

export const POST = withTenantApi<Ctx>(async (request, ctx) => {
  const params = ctx.params;
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await params;
  const body = (await request.json()) as {
    code?: string;
    name?: string;
    type?: string;
    openingBalance?: number;
  };
  const code = (body.code ?? "").trim().toUpperCase();
  const name = (body.name ?? "").trim();
  if (!code || !name) return NextResponse.json({ error: "Kode dan nama wajib diisi" }, { status: 400 });
  if (!(SUBLEDGER_TYPES as readonly string[]).includes(body.type ?? "")) {
    return NextResponse.json({ error: "Tipe harus CUSTOMER/VENDOR/SHAREHOLDER/OTHER" }, { status: 400 });
  }
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  try {
    const created = await prisma.subledger.create({
      data: {
        firmId: guard.session.user.firmId,
        clientId: id,
        code,
        name,
        type: body.type as "CUSTOMER",
        openingBalance: Number(body.openingBalance ?? 0),
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as { meta?: { target?: string[] } }).meta?.target?.includes("code") ? "Kode subledger sudah ada untuk klien ini" : "Gagal menyimpan" },
      { status: 409 },
    );
  }
});
