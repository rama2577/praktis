/**
 * EN-04 — Route handler wrapper untuk tenant context.
 *
 * Dibungkus terpisah dari `lib/tenant.ts` karena import Next.js + Auth.js
 * agar core tenant tetap testable tanpa dependensi framework.
 *
 *   import { withTenantApi } from "@/lib/tenant-api";
 *   export const GET = withTenantApi(async (req, ctx) => { ... });
 *
 * `withTenantApi` menangani: (1) auth — 401 jika tidak ada firmId di session,
 * (2) tenant context — semua query prisma di dalam handler otomatis di-scope
 * ke firmId via Prisma Client extension (lihat src/lib/tenant.ts).
 * Role check tetap eksplisit per route via requireRoleApi.
 */

import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/tenant";
import type { NextRequest } from "next/server";

export function withTenantApi<Ctx = unknown>(
  handler: (req: NextRequest, ctx: Ctx) => Promise<Response>,
) {
  return async (req: NextRequest, ...rest: unknown[]) => {
    const session = await auth();
    if (!session?.user?.firmId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return withTenant(session.user.firmId, () => handler(req, rest[0] as Ctx));
  };
}
