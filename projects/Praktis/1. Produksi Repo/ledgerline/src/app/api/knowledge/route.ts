import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoleApi } from "@/lib/rbac";
import { withTenantApi } from "@/lib/tenant-api";
import { createKnowledgeDraft, listKnowledgeItems } from "@/server/knowledge";

/** GET /api/knowledge — daftar semua versi KB (staff login). */
export const GET = withTenantApi(async () => {
  const guard = await requireRoleApi([Role.ADMIN, Role.PARTNER, Role.SENIOR, Role.JUNIOR]);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const items = await listKnowledgeItems();
  return NextResponse.json({ items });
});

/** POST /api/knowledge — buat draf versi baru KB (Senior/Partner/Admin). */
export const POST = withTenantApi(async (req) => {
  const guard = await requireRoleApi([Role.ADMIN, Role.PARTNER, Role.SENIOR]);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const { category, name, title, content, effectiveDate, changeNote } = body as {
    category?: string;
    name?: string;
    title?: string;
    content?: string;
    effectiveDate?: string;
    changeNote?: string;
  };

  if (!category || !name || !title || !content || !effectiveDate) {
    return NextResponse.json({ error: "category, name, title, content, effectiveDate wajib" }, { status: 400 });
  }

  const item = await createKnowledgeDraft({
    category,
    name,
    title,
    content,
    effectiveDate: new Date(effectiveDate),
    changeNote,
    createdById: guard.session.user.id,
  });
  return NextResponse.json({ item }, { status: 201 });
});
