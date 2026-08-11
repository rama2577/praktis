import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { getClerkMetrics, getFirmMetrics, getQualityMetrics, pct } from "@/server/metrics";
import type { StatusConfidence, StageBreachRate } from "@/server/metrics";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  APPROVED: "bg-emerald-500",
  EXCEPTION: "bg-red-500",
  REJECTED: "bg-red-500",
  DRAFT: "bg-slate-500",
  JUNIOR_REVIEW: "bg-amber-400",
  SENIOR_REVIEW: "bg-yellow-400",
  TAX_REVIEW: "bg-sky-500",
  PARTNER_APPROVAL: "bg-purple-500",
};

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Disetujui",
  EXCEPTION: "Exception",
  REJECTED: "Ditolak",
  DRAFT: "Draft",
  JUNIOR_REVIEW: "Review Junior",
  SENIOR_REVIEW: "Review Senior",
  TAX_REVIEW: "Review Pajak",
  PARTNER_APPROVAL: "Persetujuan Partner",
};

function StatusConfidenceBars({ rows }: { rows: StatusConfidence[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const pctVal = r.avgConfidence === null ? 0 : Math.round(r.avgConfidence * 100);
        return (
          <div key={r.status} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 text-slate-300">{STATUS_LABEL[r.status] ?? r.status}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full ${STATUS_TONE[r.status] ?? "bg-slate-500"}`} style={{ width: `${pctVal}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums text-xs text-slate-400">
              {r.avgConfidence === null ? "—" : `${pctVal}%`} · {r.count} jurnal
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BreachBars({ rows }: { rows: StageBreachRate[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.stage} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 text-slate-300">
            {r.stage === "JUNIOR" ? "Junior" : r.stage === "SENIOR" ? "Senior" : r.stage === "TAX" ? "Pajak" : "Partner"}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full ${r.rate > 0 ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, r.rate)}%` }}
            />
          </div>
          <span className="w-28 shrink-0 text-right tabular-nums text-xs text-slate-400">
            {r.breached}/{r.total} breach · {r.rate.toLocaleString("id-ID")}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function QualityPage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const m = await getQualityMetrics(session.user.firmId);
  const clerks = await getClerkMetrics(session.user.firmId);
  const firm = await getFirmMetrics(session.user.firmId);

  const cards = [
    { label: "Jurnal Total", value: String(m.totalJournals), hint: `${m.approvedCount} disetujui · ${m.rejectedCount} ditolak`, tone: "text-slate-100" },
    { label: "Lolos Tanpa Revisi", value: `${m.firstPassRate.toLocaleString("id-ID")}%`, hint: "task review tanpa reject", tone: "text-emerald-400" },
    { label: "Exception Rate", value: `${m.exceptionRate.toLocaleString("id-ID")}%`, hint: `${m.exceptionCount} jurnal ber-exception`, tone: m.exceptionRate > 0 ? "text-amber-400" : "text-emerald-400" },
    { label: "Rata-rata Confidence", value: m.avgConfidenceAll === null ? "—" : `${pct(m.avgConfidenceAll * 100, 100)}%`, hint: "skor keyakinan AI", tone: "text-sky-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Metrik Kualitas</h1>
        <p className="mt-1 text-sm text-slate-400">
          Akurasi AI vs hasil review manusia, korelasi confidence, dan breach rate per stage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{c.label}</p>
            <p className={`mt-2 text-3xl font-semibold tabular-nums ${c.tone}`}>{c.value}</p>
            <p className="mt-1 text-xs text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-card/40 p-5">
          <h2 className="mb-3 font-medium text-slate-100">Confidence vs Status</h2>
          <p className="mb-4 text-xs text-slate-500">
            Rata-rata skor keyakinan AI per status — exception & penolakan seharusnya berkorelasi dengan confidence rendah.
          </p>
          <StatusConfidenceBars rows={m.statusConfidence} />
        </section>
        <section className="rounded-xl border border-line bg-card/40 p-5">
          <h2 className="mb-3 font-medium text-slate-100">SLA Breach Rate per Stage</h2>
          <p className="mb-4 text-xs text-slate-500">Proporsi task yang melewati tenggat dari seluruh event SLA tercatat.</p>
          <BreachBars rows={m.stageBreachRates} />
        </section>
      </div>

      {/* EN-10: Performa Tim — metrik per clerk & firma */}
      <section className="rounded-xl border border-trust/20 bg-card/40 p-5">
        <h2 className="mb-1 font-medium text-slate-100">Performa Tim</h2>
        <p className="mb-4 text-xs text-slate-500">
          Metrik per clerk & ringkasan firma — basis untuk evaluasi beban kerja dan kualitas review.
        </p>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-slate-900/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Task Selesai</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">{firm.totalTasks}</p>
          </div>
          <div className="rounded-lg border border-line bg-slate-900/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Rata-rata Review</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">
              {firm.avgReviewMinutes === null ? "—" : `${firm.avgReviewMinutes} mnt`}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-slate-900/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">SLA Met</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-400">
              {firm.avgSlaRate === null ? "—" : `${firm.avgSlaRate.toLocaleString("id-ID")}%`}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-slate-900/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Disetujui</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">{firm.totalApproved}</p>
          </div>
        </div>

        {clerks.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada data review per clerk.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th scope="col" className="px-3 py-2">Clerk</th>
                  <th scope="col" className="px-3 py-2">Role</th>
                  <th scope="col" className="px-3 py-2 text-right">Review</th>
                  <th scope="col" className="px-3 py-2 text-right">Approve</th>
                  <th scope="col" className="px-3 py-2 text-right">Tolak</th>
                  <th scope="col" className="px-3 py-2 text-right">Rata-rata</th>
                  <th scope="col" className="px-3 py-2 text-right">SLA Met</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clerks.map((c) => (
                  <tr key={c.userId} className="hover:bg-white/5">
                    <td className="px-3 py-2 font-medium text-slate-200">{c.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{c.role}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">{c.totalReviews}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{c.approved}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-300">{c.rejected}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                      {c.avgMinutes === null ? "—" : `${c.avgMinutes} mnt`}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${c.slaRate >= 80 ? "text-emerald-300" : c.slaRate >= 50 ? "text-amber-300" : "text-red-300"}`}>
                      {c.slaRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-card/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-slate-100">Jurnal Exception</h2>
          <Link href="/dashboard/exceptions" className="text-xs text-yellow-400 hover:underline">
            Kelola exception →
          </Link>
        </div>
        {m.exceptions.length === 0 ? (
          <p className="text-sm text-slate-400">Tidak ada jurnal berstatus exception.</p>
        ) : (
          <ul className="divide-y divide-line">
            {m.exceptions.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm text-slate-200">
                    <span className="font-medium">{e.clientName}</span> — {e.description ?? "tanpa deskripsi"}
                  </p>
                  <p className="mt-0.5 text-xs text-red-300/80">🚩 {e.exceptionFlag}</p>
                </div>
                <span className="text-xs tabular-nums text-slate-500">
                  confidence {e.confidence === null ? "—" : `${pct(e.confidence * 100, 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
