import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { readStoredFile } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/documents/[id]/file — unduh dokumen sumber (terenkripsi at-rest, tenant-scoped). */
export const GET = withTenantApi<Ctx>(async (_req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const doc = await prisma.document.findFirst({
    where: { id, firmId: guard.session.user.firmId },
  });
  if (!doc) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });

  try {
    const buffer = await readStoredFile(doc.filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal membaca berkas (mungkin rusak)" }, { status: 500 });
  }
});
