/**
 * Multi-period financial highlights — adaptasi dari Ikhtisar Keuangan Unilever.
 * Fetches trial-balance for multiple periods, computes key metrics side-by-side.
 */

import type { TrialBalanceRow } from "./trial-balance";
import { buildAnalysis, type Analysis } from "./financial-analysis";

export type PeriodHighlight = {
  period: string;
  penjualanBersih: number;
  labaKotor: number;
  labaUsaha: number;
  labaBersih: number;
  ebitda: number;
  totalAset: number;
  totalLiabilitas: number;
  totalEkuitas: number;
  currentRatio: number | null;
  gpm: number | null;
  opm: number | null;
  npm: number | null;
  roa: number | null;
  roe: number | null;
};

export type MultiPeriodHighlights = {
  clientName: string;
  periods: PeriodHighlight[];
  // Trend: first period = baseline (oldest), last = current
};

/** Parse period string (YYYY-MM) into a Date. */
function parsePeriod(p: string): Date {
  const [y, m] = p.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1);
}

/** Compare periods chronologically. */
function sortByPeriod(periods: string[]): string[] {
  return [...periods].sort((a, b) => parsePeriod(a).getTime() - parsePeriod(b).getTime());
}

function sumBal(rs: TrialBalanceRow[], cls: string | string[]) {
  const classes = Array.isArray(cls) ? cls : [cls];
  return rs.filter((r) => classes.includes(r.classification)).reduce((s, r) => s + r.balance, 0);
}

function div(a: number, b: number): number | null {
  return b === 0 ? null : a / b;
}

export function buildPeriodHighlight(rows: TrialBalanceRow[], period: string): PeriodHighlight {
  const analysis = buildAnalysis(rows, "", period);

  const pendapatan = sumBal(rows, "PENDAPATAN");
  const hppRows = rows.filter(
    (r) => r.classification === "BEBAN" &&
      (r.accountName.toLowerCase().includes("hpp") || r.accountName.toLowerCase().includes("pokok penjualan")),
  );
  const hpp = hppRows.reduce((s, r) => s + r.balance, 0);
  const labaKotor = pendapatan - hpp;
  const totalBeban = sumBal(rows, "BEBAN");
  const bebanOperasional = totalBeban - hpp;
  const labaUsaha = labaKotor - bebanOperasional;
  const labaBersih = pendapatan - totalBeban;

  // EBITDA approximation: laba usaha + beban penyusutan (if available)
  const depresiasi = rows
    .filter((r) => r.classification === "BEBAN" &&
      (r.accountName.toLowerCase().includes("penyusutan") || r.accountName.toLowerCase().includes("depresiasi")),
    )
    .reduce((s, r) => s + r.balance, 0);
  const ebitda = labaUsaha + depresiasi;

  const aset = sumBal(rows, "ASET");
  const liabilitas = sumBal(rows, "LIABILITAS");
  const ekuitas = sumBal(rows, "EKUITAS");

  const asetLancar = rows
    .filter((r) => r.classification === "ASET" && /1-1\d{3}/.test(r.accountCode))
    .reduce((s, r) => s + r.balance, 0);
  const liabilitasJP = rows
    .filter((r) => r.classification === "LIABILITAS" && r.accountCode.startsWith("2-1"))
    .reduce((s, r) => s + r.balance, 0);

  return {
    period,
    penjualanBersih: pendapatan,
    labaKotor,
    labaUsaha,
    labaBersih,
    ebitda,
    totalAset: aset,
    totalLiabilitas: liabilitas,
    totalEkuitas: ekuitas,
    currentRatio: div(asetLancar, liabilitasJP),
    gpm: div(labaKotor, pendapatan),
    opm: div(labaUsaha, pendapatan),
    npm: div(labaBersih, pendapatan),
    roa: div(labaBersih, aset),
    roe: div(labaBersih, ekuitas),
  };
}

/**
 * Build multi-period highlights from multiple trial balances.
 * `periodRanges`: array of {period: "YYYY-MM", rows: TrialBalanceRow[]}
 * Results are sorted chronologically (oldest → newest).
 */
export function buildMultiPeriodHighlights(
  clientName: string,
  periodRanges: { period: string; rows: TrialBalanceRow[] }[],
): MultiPeriodHighlights {
  const sorted = sortByPeriod(
    periodRanges.map((p) => p.period),
  );
  const periods = sorted.map((period) => {
    const range = periodRanges.find((r) => r.period === period);
    return buildPeriodHighlight(range?.rows ?? [], period);
  });

  return { clientName, periods };
}

// ── Formatters ───────────────────────────────────────────────────────────────

const fmtB = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(1)} T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)} M`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)} Jt`;
  return n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
};

const fmtPct = (n: number | null): string => {
  if (n === null || !isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
};

const fmtR = (n: number | null): string => {
  if (n === null || !isFinite(n)) return "—";
  return n.toFixed(2);
};

/** Generate Markdown table (Unilever-style). */
export function highlightsMarkdown(h: MultiPeriodHighlights): string {
  const out: string[] = [];
  out.push(`## Ikhtisar Keuangan — ${h.clientName}`);
  out.push("");

  const header = ["Pos", ...h.periods.map((p) => p.period)].join(" | ");
  out.push(`| ${header} |`);
  out.push(`|${h.periods.map(() => "---:").join("|")}---:|`);

  const moneyRow = (label: string, fn: (p: PeriodHighlight) => number) => {
    const vals = h.periods.map((p) => fmtB(fn(p))).join(" | ");
    out.push(`| ${label} | ${vals} |`);
  };
  const pctRow = (label: string, fn: (p: PeriodHighlight) => number | null) => {
    const vals = h.periods.map((p) => fmtPct(fn(p))).join(" | ");
    out.push(`| ${label} | ${vals} |`);
  };

  moneyRow("**Laba Rugi**", () => 0);
  moneyRow("Penjualan Bersih", (p) => p.penjualanBersih);
  moneyRow("Laba Kotor", (p) => p.labaKotor);
  moneyRow("Laba Usaha", (p) => p.labaUsaha);
  moneyRow("EBITDA", (p) => p.ebitda);
  moneyRow("Laba Bersih", (p) => p.labaBersih);
  out.push("");
  moneyRow("**Posisi Keuangan**", () => 0);
  moneyRow("Total Aset", (p) => p.totalAset);
  moneyRow("Total Liabilitas", (p) => p.totalLiabilitas);
  moneyRow("Total Ekuitas", (p) => p.totalEkuitas);
  out.push("");
  pctRow("**Rasio**", () => null);
  pctRow("GPM", (p) => p.gpm);
  pctRow("OPM", (p) => p.opm);
  pctRow("NPM", (p) => p.npm);
  pctRow("ROA", (p) => p.roa);
  pctRow("ROE", (p) => p.roe);
  pctRow("Rasio Lancar", (p) => p.currentRatio);

  return out.join("\n");
}
