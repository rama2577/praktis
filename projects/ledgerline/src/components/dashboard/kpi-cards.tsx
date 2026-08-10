import type { DashboardData } from "@/server/dashboard";

function fmt(n: number): string {
  return n.toLocaleString("id-ID");
}

function fmtPct(n: number): string {
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

const STAGE_LABEL: Record<string, string> = {
  JUNIOR: "Junior",
  SENIOR: "Senior",
  TAX: "Pajak",
  PARTNER: "Partner",
};

type CardDef = {
  label: string;
  value: string;
  valueTone: string;
  hint: string;
  hintTone?: string;
  icon: string;
};

export function KpiCards({ data }: { data: DashboardData }) {
  const delta = data.transactionsDeltaPct;
  const deltaHint =
    delta === null
      ? `vs rata-rata harian ${fmt(data.avgDailyTransactions)}`
      : `${delta > 0 ? "+" : ""}${fmtPct(delta)} vs rata-rata harian ${fmt(data.avgDailyTransactions)}`;

  const cards: CardDef[] = [
    {
      label: "First-Pass Rate",
      value: fmtPct(data.firstPassRate),
      valueTone: data.firstPassRate >= 70 ? "text-emerald-400" : data.firstPassRate >= 40 ? "text-amber-400" : "text-red-400",
      hint: "jurnal langsung disetujui tanpa exception",
      icon: "🎯",
    },
    {
      label: "Klien Aktif",
      value: fmt(data.activeClients),
      valueTone: "text-slate-100",
      hint: `+${fmt(data.newClientsThisMonth)} bulan ini`,
      icon: "🏢",
    },
    {
      label: "AI Automation",
      value: fmtPct(data.aiAutomationPct),
      valueTone: "text-emerald-400",
      hint: "jurnal AI tanpa pengecualian",
      icon: "🤖",
    },
    {
      label: "Jobs in Progress",
      value: fmt(data.jobsInProgress),
      valueTone: "text-amber-400",
      hint: `${fmt(data.aiDraftJobs)} draft AI · ${fmt(data.reviewJobs)} menunggu review`,
      icon: "⚙️",
    },
    {
      label: "Transactions Hari Ini",
      value: fmt(data.transactionsToday),
      valueTone: "text-slate-100",
      hint: deltaHint,
      hintTone: delta !== null && delta < 0 ? "text-red-400" : "text-slate-500",
      icon: "📄",
    },
    {
      label: "SLA Breaches",
      value: fmt(data.slaBreachCount),
      valueTone: data.slaBreachCount > 0 ? "text-red-400" : "text-emerald-400",
      hint:
        data.breachesByStage.length === 0
          ? "tidak ada pelanggaran"
          : data.breachesByStage.map((b) => `${STAGE_LABEL[b.stage] ?? b.stage} ${b.count}`).join(" · "),
      hintTone: data.slaBreachCount > 0 ? "text-red-300/80" : "text-slate-500",
      icon: "⏱️",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-line bg-card p-5 transition-colors hover:border-slate-600"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{card.label}</p>
            <span aria-hidden className="text-base opacity-80">
              {card.icon}
            </span>
          </div>
          <p className={`mt-2 text-3xl font-semibold tabular-nums ${card.valueTone}`}>{card.value}</p>
          <p className={`mt-1 text-xs ${card.hintTone ?? "text-slate-500"}`}>{card.hint}</p>
        </div>
      ))}
    </div>
  );
}
