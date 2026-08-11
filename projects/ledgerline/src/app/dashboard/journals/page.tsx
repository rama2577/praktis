import type { Metadata } from "next";
import { requireRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { JournalManager } from "@/components/journals/journal-manager";

export const metadata: Metadata = { title: "Jurnal Manual — Praktis" };

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.SENIOR, Role.PARTNER];

export default async function JournalsPage() {
  const session = await requireRole([Role.ADMIN, Role.JUNIOR, Role.SENIOR, Role.TAX, Role.PARTNER]);
  const canWrite = WRITE_ROLES.includes(session.user.role as Role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Jurnal Manual</h1>
        <p className="mt-1 text-sm text-slate-400">
          Catat jurnal yang kurang atau jurnal penyesuaian — langsung tercatat tanpa menunggu
          pipeline AI. Debit wajib sama dengan kredit.
        </p>
      </div>
      <JournalManager canWrite={canWrite} />
    </div>
  );
}
