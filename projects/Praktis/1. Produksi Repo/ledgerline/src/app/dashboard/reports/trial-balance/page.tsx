import type { Metadata } from "next";
import { requireRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { PARTNER_ROLES } from "@/lib/roles";
import { TrialBalanceView } from "@/components/reports/trial-balance-view";

export const metadata: Metadata = {
  title: "Neraca Percobaan — Praktis",
};

export default async function TrialBalancePage() {
  const session = await requireRole([Role.ADMIN, Role.JUNIOR, Role.SENIOR, Role.TAX, Role.PARTNER]);
  const canLock = PARTNER_ROLES.includes(session.user.role as Role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Neraca Percobaan</h1>
        <p className="mt-1 text-sm text-slate-700">
          Saldo per akun per periode dari jurnal yang disetujui — gerbang sebelum penyusunan laporan
          keuangan. Indikator kewajaran menyorot saldo tidak wajar (aset kredit, piutang negatif).
          Klik kode akun untuk membuka buku besar; Partner dapat mengunci periode.
        </p>
      </div>
      <TrialBalanceView canLock={canLock} />
    </div>
  );
}
