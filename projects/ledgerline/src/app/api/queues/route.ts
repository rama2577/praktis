import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";

/**
 * GET /api/queues — antrian review untuk user yang login.
 * - Role biasa: hanya task PENDING miliknya (assigneeId = user.id).
 * - ADMIN (dev): semua task PENDING semua stage (akses seluruh alur).
 * Urutan: urgent dulu, lalu createdAt terlama.
 */
export async function GET() {
  const session = await auth();
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const user = guard.session.user;
  const isAdmin = user.role === "ADMIN";

  const tasks = await prisma.reviewTask.findMany({
    where: {
      status: "PENDING",
      ...(isAdmin ? {} : { assigneeId: user.id }),
      journalEntry: { firmId: user.firmId },
    },
    orderBy: [{ urgent: "desc" }, { createdAt: "asc" }],
    include: {
      journalEntry: {
        include: {
          client: { select: { id: true, name: true } },
          document: { select: { id: true, fileName: true, type: true } },
          lines: { orderBy: { id: "asc" } },
        },
      },
    },
  });

  const summary = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.stage] = (acc[t.stage] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ data: tasks, summary, isAdmin });
}
