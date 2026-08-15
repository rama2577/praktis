import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { answerCommand } from "@/server/ai-command";

/** POST /api/ai/command — command bar AI (tanya data / draft / penjelasan). */
export const POST = withTenantApi(async (request) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = body?.query?.trim();
  if (!query) return NextResponse.json({ error: "Pertanyaan kosong." }, { status: 400 });
  if (query.length > 500) return NextResponse.json({ error: "Pertanyaan terlalu panjang (maks 500 karakter)." }, { status: 400 });

  const result = await answerCommand(query, guard.session.user.firmId);
  return NextResponse.json({ data: result });
});
