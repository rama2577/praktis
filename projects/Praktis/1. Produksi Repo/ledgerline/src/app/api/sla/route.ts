import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { SLA_TARGETS_MIN } from "@/server/sla";

/** GET /api/sla — ringkasan SLA: target per stage + events + status counts. */
export const GET = withTenantApi(async (req) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const firmId = guard.session.user.firmId;
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage") ?? undefined;

  const events = await prisma.slaEvent.findMany({
    where: { firmId, ...(stage ? { stage: stage as never } : {}) },
    include: {
      journalEntry: { select: { description: true, client: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const grouped = await prisma.slaEvent.groupBy({
    by: ["status"],
    where: { firmId },
    _count: true,
  });
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));

  const stageStats = await Promise.all(
    (Object.keys(SLA_TARGETS_MIN) as (keyof typeof SLA_TARGETS_MIN)[]).map(async (s) => {
      const rows = await prisma.slaEvent.findMany({
        where: { firmId, stage: s },
        select: { actualMinutes: true, status: true },
      });
      const done = rows.filter((r) => r.actualMinutes !== null);
      const avg = done.length
        ? Math.round(done.reduce((sum, r) => sum + (r.actualMinutes ?? 0), 0) / done.length)
        : null;
      return {
        stage: s,
        targetMinutes: SLA_TARGETS_MIN[s],
        avgMinutes: avg,
        total: rows.length,
        breached: rows.filter((r) => r.status === "BREACHED").length,
      };
    }),
  );

  return NextResponse.json({
    data: {
      targets: SLA_TARGETS_MIN,
      counts,
      stageStats,
      events: events.map((e) => ({
        id: e.id,
        stage: e.stage,
        status: e.status,
        targetMinutes: e.targetMinutes,
        actualMinutes: e.actualMinutes,
        createdAt: e.createdAt.toISOString(),
        journalDescription: e.journalEntry?.description ?? null,
        clientName: e.journalEntry?.client.name ?? null,
      })),
    },
  });
});
