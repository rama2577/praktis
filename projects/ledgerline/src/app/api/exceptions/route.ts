import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";

/** GET /api/exceptions — daftar jurnal berstatus EXCEPTION. */
export async function GET() {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const rows = await prisma.journalEntry.findMany({
    where: { firmId: guard.session.user.firmId, status: "EXCEPTION" },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      document: { select: { fileName: true } },
    },
  });

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      clientName: r.client.name,
      description: r.description,
      exceptionFlag: r.exceptionFlag,
      confidence: r.confidence,
      documentName: r.document?.fileName ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
