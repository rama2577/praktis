import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { importMutations } from "@/server/recon";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/clients/[id]/recon/mutations
 * Body: { period, items: [{ date, description, amount, documentId?, notes? }] }
 * Import baris mutasi bank (idempotent per deskripsi+jumlah+tanggal).
 */
export const POST = withTenantApi<Ctx>(async (req, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await ctx.params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    period?: string;
    items?: { date?: string; description?: string; amount?: number; documentId?: string; notes?: string }[];
  } | null;
  if (!body?.period || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Body: { period, items[] } wajib." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(body.period)) {
    return NextResponse.json({ error: "Format periode: YYYY-MM." }, { status: 400 });
  }

  const items = [];
  for (const it of body.items) {
    const date = it.date ? new Date(it.date) : null;
    if (!date || isNaN(date.getTime())) {
      return NextResponse.json({ error: `Tanggal tidak valid pada item "${it.description ?? ""}".` }, { status: 400 });
    }
    const amount = Number(it.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: `Jumlah (amount) harus bukan nol pada item "${it.description ?? ""}".` }, { status: 400 });
    }
    items.push({
      firmId: guard.session.user.firmId,
      clientId: client.id,
      period: body.period,
      date,
      description: it.description ?? "",
      amount,
      documentId: it.documentId ?? null,
      notes: it.notes ?? null,
    });
  }

  const created = await importMutations(items);
  return NextResponse.json({ data: { created, total: items.length }, message: `${created} mutasi diimpor (${items.length - created} duplikat di-skip).` }, { status: 201 });
});
