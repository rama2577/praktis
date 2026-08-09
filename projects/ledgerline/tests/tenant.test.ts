import { describe, expect, it } from "vitest";
import { applyTenantFilter, TENANT_MODELS } from "@/lib/tenant";

describe("applyTenantFilter (EN-04)", () => {
  const FIRM = "firm-abc";

  it("menambahkan firmId pada findMany model tenant-aware", () => {
    const args = { where: { status: "ACTIVE" } };
    const out = applyTenantFilter("Client", args, FIRM) as { where: Record<string, unknown> };
    expect(out.where).toEqual({ status: "ACTIVE", firmId: FIRM });
  });

  it("menambahkan firmId pada findFirst/count/updateMany", () => {
    ["findFirst", "count", "updateMany", "deleteMany"].forEach((op) => {
      const out = applyTenantFilter("Document", { where: {} }, FIRM) as { where: Record<string, unknown> };
      expect(out.where.firmId).toBe(FIRM);
      expect(op).toBeTruthy();
    });
  });

  it("tidak menimpa firmId yang sudah eksplisit (tidak dobel)", () => {
    const args = { where: { firmId: "firm-x", status: "ACTIVE" } };
    const out = applyTenantFilter("Client", args, FIRM) as { where: Record<string, unknown> };
    expect(out.where.firmId).toBe("firm-x");
  });

  it("ReviewTask difilter lewat relasi journalEntry.firmId", () => {
    const out = applyTenantFilter("ReviewTask", { where: { status: "PENDING" } }, FIRM) as {
      where: Record<string, unknown>;
    };
    expect(out.where.journalEntry).toEqual({ firmId: FIRM });
    expect(out.where.status).toBe("PENDING");
  });

  it("ReviewTask dengan journalEntry eksplisit tidak dobel", () => {
    const args = { where: { journalEntry: { firmId: "firm-y" } } };
    const out = applyTenantFilter("ReviewTask", args, FIRM);
    expect(out).toBe(args);
  });

  it("operasi tanpa where (mis. create) tidak diubah", () => {
    const args = { data: { name: "X", firmId: FIRM } };
    expect(applyTenantFilter("Client", args, FIRM)).toBe(args);
  });

  it("User & Firm tidak pernah di-filter (auth/seed butuh lintas-firma)", () => {
    for (const model of ["User", "Firm"]) {
      expect(TENANT_MODELS.has(model)).toBe(false);
      const out = applyTenantFilter(model, { where: { email: "x@y.z" } }, FIRM);
      expect(out).toEqual({ where: { email: "x@y.z" } });
    }
  });

  it("args non-objek dikembalikan apa adanya", () => {
    expect(applyTenantFilter("Client", undefined as never, FIRM)).toBeUndefined();
  });
});
