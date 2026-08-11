import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";

/** GET /api/webhooks — daftar subscription (Admin/Partner). */
export const GET = withTenantApi(async () => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const subs = await prisma.webhookSubscription.findMany({
    where: { firmId: guard.session.user.firmId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: subs });
});

/** POST /api/webhooks — daftarkan webhook baru. */
export const POST = withTenantApi(async (request) => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = (await request.json()) as { url?: string; secret?: string; eventTypes?: string[] };
  if (!body.url?.startsWith("https://")) {
    return NextResponse.json({ error: "URL harus HTTPS" }, { status: 400 });
  }
  if (!body.eventTypes?.length) {
    return NextResponse.json({ error: "Minimal satu eventType" }, { status: 400 });
  }

  const sub = await prisma.webhookSubscription.create({
    data: {
      firmId: guard.session.user.firmId,
      url: body.url,
      secret: body.secret,
      eventTypes: body.eventTypes,
    },
  });

  return NextResponse.json({ data: sub }, { status: 201 });
});

/** DELETE /api/webhooks?id=xxx — hapus subscription. */
export const DELETE = withTenantApi(async (request) => {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id webhook diperlukan" }, { status: 400 });

  const sub = await prisma.webhookSubscription.findUnique({ where: { id } });
  if (!sub || sub.firmId !== guard.session.user.firmId) {
    return NextResponse.json({ error: "Webhook tidak ditemukan" }, { status: 404 });
  }

  await prisma.webhookSubscription.delete({ where: { id } });
  return NextResponse.json({ message: "Webhook dihapus" });
});
