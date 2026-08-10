import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoleApi } from "@/lib/rbac";
import {
  approveClientProfile,
  coaMappingHint,
  getClientProfile,
  isValidCoaMapping,
  upsertClientProfile,
} from "@/server/client-profile";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

async function loadClientOr404(clientId: string, firmId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId, firmId } });
  if (!client) return null;
  return client;
}

/** GET /api/clients/[id]/profile — profil + hint mapping (staff login). */
export async function GET(_req: Request, ctx: Ctx) {
  const guard = await requireRoleApi([Role.ADMIN, Role.PARTNER, Role.SENIOR, Role.JUNIOR]);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;
  const client = await loadClientOr404(id, guard.session.user.firmId);
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  const profile = await getClientProfile(id);
  return NextResponse.json({ profile, mappingHint: coaMappingHint(profile) });
}

/** PUT /api/clients/[id]/profile — update manual mapping/aturan (Senior/Partner). */
export async function PUT(req: Request, ctx: Ctx) {
  const guard = await requireRoleApi([Role.ADMIN, Role.PARTNER, Role.SENIOR]);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;
  const client = await loadClientOr404(id, guard.session.user.firmId);
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    coaMapping?: unknown;
    reportTemplates?: unknown;
    rules?: unknown;
    mappingStatus?: string;
    sourcePeriod?: string | null;
  };

  if (body.coaMapping !== undefined && !isValidCoaMapping(body.coaMapping)) {
    return NextResponse.json({ error: "coaMapping tidak valid" }, { status: 400 });
  }
  const statuses = ["NONE", "LEARNING", "REVIEW", "READY"];
  if (body.mappingStatus !== undefined && !statuses.includes(body.mappingStatus)) {
    return NextResponse.json({ error: `mappingStatus harus salah satu dari: ${statuses.join(", ")}` }, { status: 400 });
  }

  const profile = await upsertClientProfile({
    clientId: id,
    firmId: guard.session.user.firmId,
    coaMapping: body.coaMapping,
    reportTemplates: body.reportTemplates,
    rules: body.rules,
    mappingStatus: body.mappingStatus as never,
    sourcePeriod: body.sourcePeriod,
    updatedById: guard.session.user.id,
  });
  return NextResponse.json({ profile });
}

/** PATCH /api/clients/[id]/profile — setujui mapping → READY (Senior/Partner). */
export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireRoleApi([Role.ADMIN, Role.PARTNER, Role.SENIOR]);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;
  const client = await loadClientOr404(id, guard.session.user.firmId);
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "approve") {
    return NextResponse.json({ error: "action harus 'approve'" }, { status: 400 });
  }
  try {
    const profile = await approveClientProfile(id, guard.session.user.id);
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
