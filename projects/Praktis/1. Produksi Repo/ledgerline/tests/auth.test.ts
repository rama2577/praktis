import { describe, expect, it } from "vitest";
import { canAccess, ROLE_LABELS, ROLE_WEIGHT, OPERATIONAL_ROLES, SYSTEM_ROLES } from "@/lib/roles";
import { Role } from "@prisma/client";

describe("RBAC: canAccess", () => {
  it("mengizinkan role yang terdaftar", () => {
    expect(canAccess(Role.JUNIOR, [Role.JUNIOR, Role.SENIOR])).toBe(true);
    expect(canAccess(Role.ADMIN, OPERATIONAL_ROLES)).toBe(true);
  });

  it("menolak role yang tidak terdaftar", () => {
    expect(canAccess(Role.JUNIOR, [Role.SENIOR])).toBe(false);
    expect(canAccess(Role.TAX, [Role.PARTNER])).toBe(false);
  });

  it("admin dev punya akses ke semua modul operasional & sistem", () => {
    expect(canAccess(Role.ADMIN, OPERATIONAL_ROLES)).toBe(true);
    expect(canAccess(Role.ADMIN, SYSTEM_ROLES)).toBe(true);
  });

  it("semua role operasional dapat mengakses dashboard", () => {
    for (const role of OPERATIONAL_ROLES) {
      expect(canAccess(role, OPERATIONAL_ROLES)).toBe(true);
    }
  });
});

describe("RBAC: metadata role", () => {
  it("setiap role punya label Bahasa Indonesia", () => {
    for (const role of Object.values(Role)) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_LABELS[role]).not.toBe(role);
    }
  });

  it("hierarki review konsisten: partner > senior > junior", () => {
    expect(ROLE_WEIGHT[Role.PARTNER]).toBeGreaterThan(ROLE_WEIGHT[Role.SENIOR]);
    expect(ROLE_WEIGHT[Role.SENIOR]).toBeGreaterThan(ROLE_WEIGHT[Role.JUNIOR]);
    expect(ROLE_WEIGHT[Role.ADMIN]).toBeGreaterThan(ROLE_WEIGHT[Role.PARTNER]);
  });
});
