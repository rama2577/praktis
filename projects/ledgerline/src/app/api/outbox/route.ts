import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { SYSTEM_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { processOutbox } from "@/server/outbox";

/** GET /api/outbox — lihat event pending/gagal (Admin/Partner). */
export async function GET(request: Request) {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "PENDING";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);

  const events = await prisma.outboxEvent.findMany({
    where: { status: status as "PENDING" | "PROCESSED" | "FAILED" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const pending = await prisma.outboxEvent.count({ where: { status: "PENDING" } });
  const failed = await prisma.outboxEvent.count({ where: { status: "FAILED" } });

  return NextResponse.json({ data: { events, summary: { pending, failed } } });
}

/** POST /api/outbox — trigger proses (Admin). */
export async function POST() {
  const guard = await requireRoleApi(SYSTEM_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const result = await processOutbox();
  return NextResponse.json({ data: result });
}
