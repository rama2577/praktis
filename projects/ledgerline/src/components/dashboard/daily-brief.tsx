import Link from "next/link";
import type { DailyBrief } from "@/server/brief";

const STATUS_TONE: Record<string, string> = {
  EXCEPTION: "bg-red-500/15 text-red-300",
  DRAFT: "bg-slate-600/30 text-slate-300",
  JUNIOR_REVIEW: "bg-sky-500/15 text-sky-300",
  SENIOR_REVIEW: "bg-violet-500/15 text-violet-300",
  TAX_REVIEW: "bg-amber-500/15 text-amber-300",
  PARTNER_APPROVAL: "bg-emerald-500/15 text-emerald-300",
};

/** Panel "Today" — inbox cerdas akuntan: ringkasan harian + antrian review terprioritas. */
export function DailyBriefPanel({ brief }: { brief: DailyBrief }) {
  return (
    <section className="rounded-xl border border-trust/20 bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">Hari Ini</h2>
        <span className="text-[11px] text-slate-500">inbox cerdas · otomatis</span>
      </div>

      <p className="mt-2 text-sm text-slate-300">{brief.summary}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {brief.items.map((i) => (
          <Link
            key={i.kind}
            href={i.href}
            className="rounded-full border border-line bg-slate-900/40 px-3 py-1 text-xs text-slate-300 transition hover:border-accent/50 hover:text-accent"
          >
            {i.text}: <span className="font-semibold tabular-nums text-slate-100">{i.count}</span>
          </Link>
        ))}
      </div>

      {brief.anomalies.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {brief.anomalies.map((a) => (
            <Link
              key={a.type}
              href={a.href}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                a.severity === "high"
                  ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
              }`}
            >
              <span aria-hidden>⚠️</span>
              <span className="font-medium">{a.count}× {a.text}</span>
              <span className="ml-auto text-slate-400">→</span>
            </Link>
          ))}
        </div>
      )}

      {brief.deadlines.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Deadline terdekat</p>
          <div className="space-y-1">
            {brief.deadlines.slice(0, 5).map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-slate-900/40 px-3 py-1.5 text-xs">
                <span className="truncate text-slate-300">
                  {d.clientName} · {d.type}
                </span>
                <span className={`shrink-0 font-medium tabular-nums ${d.daysLeft <= 7 ? "text-red-300" : "text-slate-400"}`}>
                  {d.daysLeft} hari lagi
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {brief.priorityQueue.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-5 text-center text-sm text-slate-500">
          Tidak ada jurnal menunggu review. 👍
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line/50 overflow-hidden rounded-lg border border-line">
          {brief.priorityQueue.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="truncate text-slate-300">{j.clientName}</span>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[j.status] ?? "bg-slate-600/30 text-slate-300"}`}>
                {j.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
