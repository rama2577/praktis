import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { ExceptionsList } from "@/components/exceptions/exceptions-list";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage() {
  await requireRole(OPERATIONAL_ROLES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Manajemen Exception</h1>
        <p className="mt-1 text-sm text-slate-700">
          Jurnal yang ditandai AI karena dokumen tidak jelas (mis. faktur PPN hilang).
          Resolusi mengirimnya kembali ke pipeline untuk diproses ulang — riwayat tercatat di Activity Log.
        </p>
      </div>

      <ExceptionsList />
    </div>
  );
}
