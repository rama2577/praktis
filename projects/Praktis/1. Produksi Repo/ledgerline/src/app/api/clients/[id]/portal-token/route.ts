import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { ensurePortalToken } from "@/server/portal";

/**
 * POST /api/clients/[id]/portal-token
 * Buat/reset token portal klien (token lama invalid otomatis) → URL siap disalin.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole(SYSTEM_ROLES);
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, firmId: session.user.firmId },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  }

  const token = await ensurePortalToken(client.id);
  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const path = `/portal/${token.token}`;

  return NextResponse.json({
    token: token.token,
    url: baseUrl ? `${baseUrl}${path}` : path,
    expiresAt: token.expiresAt.toISOString(),
  });
}
