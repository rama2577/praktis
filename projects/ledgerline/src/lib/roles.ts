import { Role } from "@prisma/client";

/** Label role dalam Bahasa Indonesia (untuk UI). */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin Dev",
  JUNIOR: "Junior Accountant",
  SENIOR: "Senior Accountant",
  TAX: "Tax Specialist",
  PARTNER: "Partner",
};

/** Urutan hierarki review (semakin besar semakin senior). */
export const ROLE_WEIGHT: Record<Role, number> = {
  JUNIOR: 1,
  TAX: 2,
  SENIOR: 3,
  PARTNER: 4,
  ADMIN: 99,
};

/** Cek apakah role termasuk daftar yang diizinkan. */
export function canAccess(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

/** Role yang boleh mengakses modul operasional (dashboard, queue, dll). */
export const OPERATIONAL_ROLES: Role[] = [
  Role.ADMIN,
  Role.JUNIOR,
  Role.SENIOR,
  Role.TAX,
  Role.PARTNER,
];

/** Role yang boleh mengakses pengaturan sistem & manajemen klien penuh. */
export const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.SENIOR];

/** Role yang boleh mengunci periode tutup buku (partner + admin). */
export const PARTNER_ROLES: Role[] = [Role.ADMIN, Role.PARTNER];

/** Role yang boleh reclass/edit jurnal APPROVED (senior + partner + admin). */
export const EDIT_JOURNAL_ROLES: Role[] = [Role.ADMIN, Role.SENIOR, Role.PARTNER];
