import { describe, expect, it } from "vitest";
import { applyTenantFilter, FILTERABLE_OPS, TENANT_MODELS } from "@/lib/tenant";

describe("applyTenantFilter (EN-04)", () => {
  const FIRM = "firm-abc";

  it("menambahkan firmId pada findMany model tenant-aware", () => {
    const args = { where: { status: "ACTIVE" } };
    const out = applyTenantFilter("Client", "findMany", args, FIRM) as { where: Record<string, unknown> };
    expect(out.where).toEqual({ status: "ACTIVE", firmId: FIRM });
  });

  it("menambahkan firmId pada findFirst/count/updateMany/deleteMany", () => {
    ["findFirst", "findFirstOrThrow", "count", "updateMany", "deleteMany"].forEach((op) => {
      const out = applyTenantFilter("Document", op, { where: {} }, FIRM) as { where: Record<string, unknown> };
      expect(out.where.firmId).toBe(FIRM);
      expect(FILTERABLE_OPS.has(op)).toBe(true);
    });
  });

  it("tidak menimpa firmId yang sudah eksplisit (tidak dobel)", () => {
    const args = { where: { firmId: "firm-x", status: "ACTIVE" } };
    const out = applyTenantFilter("Client", "findMany", args, FIRM) as { where: Record<string, unknown> };
    expect(out.where.firmId).toBe("firm-x");
  });

  it("ReviewTask difilter lewat relasi journalEntry.firmId", () => {
    const out = applyTenantFilter("ReviewTask", "findMany", { where: { status: "PENDING" } }, FIRM) as {
      where: Record<string, unknown>;
    };
    expect(out.where.journalEntry).toEqual({ firmId: FIRM });
    expect(out.where.status).toBe("PENDING");
  });

  it("ReviewTask dengan journalEntry eksplisit tidak dobel", () => {
    const args = { where: { journalEntry: { firmId: "firm-y" } } };
    const out = applyTenantFilter("ReviewTask", "findMany", args, FIRM);
    expect(out).toBe(args);
  });

  it("operasi tanpa where (mis. create) tidak diubah", () => {
    const args = { data: { name: "X", firmId: FIRM } };
    expect(applyTenantFilter("Client", "create", args, FIRM)).toBe(args);
  });

  it("operasi singular (findUnique/update/delete) TIDAK difilter — where harus unique", () => {
    for (const op of ["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"]) {
      const args = { where: { id: "rec-1" }, data: { name: "X" } };
      const out = applyTenantFilter("Client", op, args, FIRM);
      expect(out).toBe(args);
      expect(FILTERABLE_OPS.has(op)).toBe(false);
    }
  });

  it("User & Firm tidak pernah di-filter (auth/seed butuh lintas-firma)", () => {
    for (const model of ["User", "Firm"]) {
      expect(TENANT_MODELS.has(model)).toBe(false);
      const out = applyTenantFilter(model, "findMany", { where: { email: "x@y.z" } }, FIRM);
      expect(out).toEqual({ where: { email: "x@y.z" } });
    }
  });

  it("args non-objek dikembalikan apa adanya", () => {
    expect(applyTenantFilter("Client", "findMany", undefined as never, FIRM)).toBeUndefined();
  });
});
