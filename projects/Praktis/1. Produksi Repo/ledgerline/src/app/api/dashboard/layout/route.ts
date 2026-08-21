import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";

/**
 * F7 — Persistensi layout Dockview per user.
 * GET  → layout tersimpan (JSON string) atau null
 * PUT  → simpan/update layout pengguna
 */

export async function GET() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const row = await prisma.dashboardLayout.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ layout: row?.layoutJson ?? null });
}

export async function PUT(req: Request) {
  const session = await requireRole(OPERATIONAL_ROLES);
  const body = await req.json().catch(() => null);
  const layout = typeof body?.layout === "string" ? body.layout : null;
  if (!layout) {
    return NextResponse.json({ error: "layout wajib berupa string JSON" }, { status: 400 });
  }
  if (layout.length > 200_000) {
    return NextResponse.json({ error: "layout terlalu besar" }, { status: 413 });
  }
  // Validasi JSON minimal (harus bisa di-parse).
  try {
    JSON.parse(layout);
  } catch {
    return NextResponse.json({ error: "layout bukan JSON valid" }, { status: 400 });
  }

  const saved = await prisma.dashboardLayout.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, layoutJson: layout },
    update: { layoutJson: layout },
  });
  return NextResponse.json({ ok: true, id: saved.id });
}

export async function DELETE() {
  const session = await requireRole(OPERATIONAL_ROLES);
  await prisma.dashboardLayout.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
