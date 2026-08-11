import type { Metadata } from "next";
import { TrialBalanceView } from "@/components/reports/trial-balance-view";

export const metadata: Metadata = {
  title: "Neraca Percobaan — Praktis",
};

export default function TrialBalancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Neraca Percobaan</h1>
        <p className="mt-1 text-sm text-slate-400">
          Saldo per akun per periode dari jurnal yang disetujui — gerbang sebelum penyusunan laporan
          keuangan. Indikator kewajaran menyorot saldo tidak wajar (aset kredit, piutang negatif).
        </p>
      </div>
      <TrialBalanceView />
    </div>
  );
}
