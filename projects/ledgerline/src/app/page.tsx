import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

const PIPELINE_STEPS = [
  "Upload Dokumen",
  "AI Draft Jurnal",
  "Review Junior",
  "Review Senior",
  "Tax & Partner",
  "Delivery",
] as const;

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-2xl border border-line bg-card p-8 shadow-2xl shadow-black/40 sm:p-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent font-bold text-[#ffffff]">
              LL
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Praktis
              </h1>
              <p className="text-sm text-slate-700">AI Bookkeeping Platform</p>
            </div>
          </div>
          <StatusBadge label="Pilot terbatas · menuju GA" tone="accent" />
        </div>

        <p className="mt-8 leading-relaxed text-slate-700">
          Platform AI bookkeeping untuk kantor akuntan Indonesia — dokumen
          klien (invoice, rekening koran) diubah menjadi draft jurnal sesuai
          PSAK &amp; perpajakan, lalu direview berjenjang sebelum disetujui.
        </p>

        <ol className="mt-8 grid gap-2 sm:grid-cols-2">
          {PIPELINE_STEPS.map((step, i) => (
            <li
              key={step}
              className="flex items-center gap-3 rounded-lg border border-line bg-background/60 px-3 py-2.5 text-sm text-slate-700"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-semibold text-accent">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/login"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-[#ffffff] transition hover:bg-accent/90"
          >
            Masuk ke Dashboard
          </Link>
          <p className="text-xs leading-relaxed text-slate-700">
            Login untuk mengakses dashboard — draft jurnal, review berjenjang,
            dan laporan.
          </p>
        </div>
      </div>
    </main>
  );
}
