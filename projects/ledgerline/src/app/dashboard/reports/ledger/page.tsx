import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { EDIT_JOURNAL_ROLES } from "@/lib/roles";
import { LedgerView } from "@/components/reports/ledger-view";

export const metadata: Metadata = {
  title: "Buku Besar — Praktis",
};

export default async function LedgerPage() {
  const session = await requireRole([Role.ADMIN, Role.JUNIOR, Role.SENIOR, Role.TAX, Role.PARTNER]);
  const canEdit = EDIT_JOURNAL_ROLES.includes(session.user.role as Role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Buku Besar</h1>
        <p className="mt-1 text-sm text-slate-400">
          Seluruh jurnal satu akun per periode dengan saldo berjalan. Selama periode terbuka,
          Senior/Partner dapat mereclass jurnal APPROVED.
        </p>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Memuat…</div>}>
        <LedgerView canEdit={canEdit} />
      </Suspense>
    </div>
  );
}
