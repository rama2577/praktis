/**
 * EN-04 — Route handler wrapper untuk tenant context.
 *
 * Dibungkus terpisah dari `lib/tenant.ts` karena import Next.js + Auth.js
 * agar core tenant tetap testable tanpa dependensi framework.
 *
 *   import { withTenantApi } from "@/lib/tenant-api";
 *   export const GET = withTenantApi(async (req, ctx) => { ... });
 */

import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/tenant";
import type { NextRequest } from "next/server";

export function withTenantApi(
  handler: (req: NextRequest, ...rest: unknown[]) => Promise<Response>,
) {
  return async (req: NextRequest, ...rest: unknown[]) => {
    const session = await auth();
    if (!session?.user?.firmId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return withTenant(session.user.firmId, () => handler(req, ...rest));
  };
}
