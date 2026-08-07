import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import type { Role } from "@prisma/client";

/**
 * Guard untuk halaman server (Server Components / route handlers).
 * - Belum login → redirect ke /login
 * - Role tidak diizinkan → redirect ke /dashboard?error=forbidden
 */
export async function requireRole(allowed: Role[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccess(session.user.role, allowed)) {
    redirect("/dashboard?error=forbidden");
  }
  return session;
}

export type ApiGuardResult =
  | { ok: true; session: Session }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Guard untuk API route handlers — mengembalikan objek error, tidak melempar.
 * Contoh pemakaian di route handler:
 *   const guard = await requireRoleApi([Role.ADMIN]);
 *   if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
 */
export async function requireRoleApi(allowed: Role[]): Promise<ApiGuardResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, message: "Belum login" };
  }
  if (!canAccess(session.user.role, allowed)) {
    return { ok: false, status: 403, message: "Tidak memiliki akses" };
  }
  return { ok: true, session };
}
