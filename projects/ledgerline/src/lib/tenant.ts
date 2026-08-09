import { AsyncLocalStorage } from "node:async_hooks";

/**
 * EN-04 (F1) — Tenant context & filter otomatis.
 *
 * Prisma Client extension membaca firmId dari AsyncLocalStorage dan
 * menyuntikkannya ke query secara otomatis — menghilangkan kelas bug
 * "lupa filter firmId" (TD-09). Aktif HANYA saat kode berjalan di dalam
 * `withTenant(firmId, ...)`; di luar itu (auth, seed, script) tidak ada filter.
 */

export const tenantStorage = new AsyncLocalStorage<string | null>();

/** Jalankan `fn` dengan tenant aktif — semua query prisma di dalamnya otomatis di-scope. */
export function withTenant<T>(firmId: string, fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run(firmId, fn);
}

/** firmId tenant saat ini, atau null di luar konteks tenant. */
export function getTenantFirmId(): string | null {
  return tenantStorage.getStore() ?? null;
}

/** Model yang punya kolom `firmId` langsung. */
export const TENANT_MODELS = new Set([
  "Client",
  "Document",
  "JournalEntry",
  "ActivityLog",
  "SlaEvent",
]);

/**
 * Terapkan filter tenant pada args query (murni — bisa diuji tanpa DB).
 * Aturan:
 * - model dengan kolom firmId → tambah `where.firmId` (jika belum ada)
 * - ReviewTask (tanpa firmId) → filter lewat relasi `journalEntry.firmId`
 * - operasi tanpa `where` (mis. create) → args utuh
 * - `where.firmId`/`where.journalEntry` sudah ada → tidak dobel
 */
export function applyTenantFilter(model: string, args: unknown, firmId: string): unknown {
  if (typeof args !== "object" || args === null) return args;
  const a = args as { where?: Record<string, unknown> };
  if (!("where" in a)) return args;

  const where = a.where ?? {};
  if (TENANT_MODELS.has(model) && !("firmId" in where)) {
    return { ...a, where: { ...where, firmId } };
  }
  if (model === "ReviewTask" && !("journalEntry" in where)) {
    return { ...a, where: { ...where, journalEntry: { firmId } } };
  }
  return args;
}
