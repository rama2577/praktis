import { PrismaClient } from "@prisma/client";
import { applyTenantFilter, getTenantFirmId } from "@/lib/tenant";

/**
 * EN-04 (F1) — Prisma Client dengan extension tenant-aware.
 * Query di dalam `withTenant(firmId, ...)` otomatis di-scope ke firmId
 * (lihat src/lib/tenant.ts). Di luar konteks tenant, perilaku = polos.
 */
function createClient() {
  const base = new PrismaClient();
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const firmId = getTenantFirmId();
          if (!firmId) return query(args);
          return query(applyTenantFilter(model, operation, args, firmId) as typeof args);
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof createClient>;

// Singleton — hindari koneksi ganda saat hot-reload dev.
const globalForPrisma = globalThis as unknown as { prisma?: TenantPrismaClient };

export const prisma: TenantPrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
