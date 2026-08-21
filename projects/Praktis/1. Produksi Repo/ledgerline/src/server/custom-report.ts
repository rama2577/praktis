/**
 * F6B — Laporan custom AI (M7).
 * Alur: minta laporan → AI usulkan struktur → akuntan setujui → simpan template
 * di ClientProfile.reportTemplates → jalankan & export. Dimensi (proyek/channel)
 * dibaca dari JournalLine.dimension (jsonb).
 *
 * Mode "AI" = rule-based terstruktur (fallback deterministik tanpa LLM eksternal).
 */

import { prisma } from "@/lib/db";

// ── Jenis laporan yang dikenali ──────────────────────────────────────────────

export type ReportKind =
  | "LABA_RUGI"
  | "NERACA"
  | "ARUS_KAS"
  | "PENJUALAN"
  | "BEBAN"
  | "PENDAPATAN_PER_PROYEK"
  | "BEBAN_PER_CHANNEL"
  | "PENJUALAN_PER_CHANNEL";

export type DimensionFilter = { project?: string; channel?: string };

export type ReportTemplate = {
  id: string;
  name: string;
  kind: ReportKind;
  description?: string;
  dimensions: DimensionFilter; // filter tetap dari usulan AI
  groupBy?: "project" | "channel" | null;
  period: string; // periode template dibuat (bisa dijalankan ulang per periode)
  createdAt: string;
};

export type SuggestedStructure = {
  name: string;
  kind: ReportKind;
  description: string;
  dimensions: DimensionFilter;
  groupBy: "project" | "channel" | null;
  columns: string[];
  confidence: number;
  reasons: string[];
};

// ── Parse prompt (pure) ──────────────────────────────────────────────────────

const KIND_KEYWORDS: [ReportKind, string[]][] = [
  ["LABA_RUGI", ["laba rugi", "profit", "rugi", "pnl", "income statement"]],
  ["NERACA", ["neraca", "balance sheet", "posisi keuangan", "aset", "ekuitas"]],
  ["ARUS_KAS", ["arus kas", "cash flow", "cashflow"]],
  ["PENJUALAN", ["penjualan", "sales", "omzet", "pendapatan", "revenue"]],
  ["BEBAN", ["beban", "biaya", "expense", "cost"]],
];

const PROJECT_KEYWORDS = ["proyek", "project", "per proyek", "divisi"];
const CHANNEL_KEYWORDS = ["channel", "kanal", "online", "offline", "toko", "platform"];

/** Deteksi jenis laporan dari prompt. */
export function detectReportKind(prompt: string): ReportKind | null {
  const p = prompt.toLowerCase();
  // Kombinasi pendapatan/beban + dimensi → jenis spesifik
  const hasProject = PROJECT_KEYWORDS.some((k) => p.includes(k));
  const hasChannel = CHANNEL_KEYWORDS.some((k) => p.includes(k));
  if (hasProject && (p.includes("penjualan") || p.includes("pendapatan"))) return "PENDAPATAN_PER_PROYEK";
  if (hasProject && (p.includes("beban") || p.includes("biaya"))) return "BEBAN_PER_CHANNEL"; // fallback group proyek
  if (hasChannel && (p.includes("penjualan") || p.includes("pendapatan"))) return "PENJUALAN_PER_CHANNEL";
  if (hasChannel && (p.includes("beban") || p.includes("biaya"))) return "BEBAN_PER_CHANNEL";
  for (const [kind, words] of KIND_KEYWORDS) {
    if (words.some((w) => p.includes(w))) return kind;
  }
  return null;
}

export type ParsedPrompt = {
  kind: ReportKind | null;
  dimension: DimensionFilter;
  groupBy: "project" | "channel" | null;
};

/** Ekstrak dimensi (proyek/channel) yang disebut di prompt. */
export function parseReportPrompt(prompt: string): ParsedPrompt {
  const p = prompt.toLowerCase();
  const kind = detectReportKind(prompt);
  const hasProject = PROJECT_KEYWORDS.some((k) => p.includes(k));
  const hasChannel = CHANNEL_KEYWORDS.some((k) => p.includes(k));

  // Coba tangkap nama proyek/channel dalam tanda kutip
  const quoted = /["'“”]([^"'“”]{2,40})["'“”]/g;
  const quotes = [...prompt.matchAll(quoted)].map((m) => m[1].trim());

  const dimension: DimensionFilter = {};
  if (hasProject) dimension.project = quotes[0] ?? undefined;
  if (hasChannel) dimension.channel = quotes[0] ?? undefined;

  let groupBy: "project" | "channel" | null = null;
  if (hasProject && !hasChannel) groupBy = "project";
  else if (hasChannel && !hasProject) groupBy = "channel";
  else if (hasProject && hasChannel) groupBy = quotes.length > 1 ? "project" : "channel";

  return { kind, dimension, groupBy };
}

// ── Usulan struktur AI (pure) ────────────────────────────────────────────────

export function suggestReportStructure(prompt: string, period: string): SuggestedStructure {
  const parsed = parseReportPrompt(prompt);
  const kind = parsed.kind ?? "LABA_RUGI";
  const reasons: string[] = [];

  const base: Omit<SuggestedStructure, "kind" | "columns" | "name"> = {
    description: "",
    dimensions: parsed.dimension,
    groupBy: parsed.groupBy,
    confidence: 0,
    reasons,
  };

  switch (kind) {
    case "LABA_RUGI":
      reasons.push("Deteksi kata kunci laba/rugi");
      return {
        ...base,
        name: `Laba Rugi ${period}`,
        kind,
        description: "Pendapatan dikurangi beban per akun, dengan total laba/rugi periode.",
        columns: ["Akun", "Jumlah"],
        confidence: 0.92,
      };
    case "NERACA":
      reasons.push("Deteksi kata kunci neraca/posisi keuangan");
      return {
        ...base,
        name: `Neraca ${period}`,
        kind,
        description: "Aset, liabilitas, dan ekuitas pada akhir periode.",
        columns: ["Akun", "Saldo"],
        confidence: 0.9,
      };
    case "ARUS_KAS":
      reasons.push("Deteksi kata kunci arus kas");
      return {
        ...base,
        name: `Arus Kas ${period}`,
        kind,
        description: "Klasifikasi arus kas operasi, investasi, dan pendanaan.",
        columns: ["Aktivitas", "Jumlah"],
        confidence: 0.85,
      };
    case "PENJUALAN":
      reasons.push("Deteksi kata kunci penjualan/pendapatan");
      return {
        ...base,
        name: `Penjualan ${period}`,
        kind,
        description: "Total penjualan per akun pendapatan.",
        columns: ["Akun", "Penjualan"],
        confidence: 0.9,
      };
    case "BEBAN":
      reasons.push("Deteksi kata kunci beban/biaya");
      return {
        ...base,
        name: `Beban ${period}`,
        kind,
        description: "Rincian beban per akun.",
        columns: ["Akun", "Beban"],
        confidence: 0.9,
      };
    case "PENDAPATAN_PER_PROYEK":
      reasons.push("Prompt menyebut proyek + pendapatan → laporan per proyek");
      return {
        ...base,
        name: `Pendapatan per Proyek ${period}`,
        kind,
        description: "Pendapatan dikelompokkan per proyek (dimensi baris jurnal).",
        columns: ["Proyek", "Pendapatan"],
        confidence: 0.88,
      };
    case "BEBAN_PER_CHANNEL":
      reasons.push("Prompt menyebut beban + channel/proyek → laporan per dimensi");
      return {
        ...base,
        name: `Beban per Channel ${period}`,
        kind,
        description: "Beban dikelompokkan per channel (dimensi baris jurnal).",
        columns: ["Channel", "Beban"],
        confidence: 0.86,
      };
    case "PENJUALAN_PER_CHANNEL":
      reasons.push("Prompt menyebut channel + penjualan → laporan per channel");
      return {
        ...base,
        name: `Penjualan per Channel ${period}`,
        kind,
        description: "Penjualan dikelompokkan per channel (dimensi baris jurnal).",
        columns: ["Channel", "Penjualan"],
        confidence: 0.88,
      };
  }
}

// ── Bangun data laporan (pure) ───────────────────────────────────────────────

export type JournalLineForReport = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  dimension: { project?: string; channel?: string } | null;
  entryDate: string;
  status: string;
};

export type ReportRow = { label: string; amount: number };

function matchesDimension(
  line: JournalLineForReport,
  dim: DimensionFilter | undefined,
): boolean {
  if (!dim) return true;
  if (dim.project && line.dimension?.project !== dim.project) return false;
  if (dim.channel && line.dimension?.channel !== dim.channel) return false;
  return true;
}

const REVENUE_PREFIXES = ["4-"];
const EXPENSE_PREFIXES = ["5-"];
const ASSET_PREFIXES = ["1-"];
const LIABILITY_PREFIXES = ["2-"];
const EQUITY_PREFIXES = ["3-"];

export function buildCustomReport(
  lines: JournalLineForReport[],
  kind: ReportKind,
  dimension?: DimensionFilter,
  groupBy?: "project" | "channel" | null,
): { rows: ReportRow[]; total: number; filteredLines: number } {
  const filtered = lines.filter(
    (l) => l.status === "APPROVED" || l.status === "FINALIZED",
  );

  const inDim = filtered.filter((l) => matchesDimension(l, dimension));

  const amountOf = (l: JournalLineForReport) =>
    l.accountCode.startsWith("1-") || l.accountCode.startsWith("5-")
      ? l.debit - l.credit
      : l.credit - l.debit;

  const rows: ReportRow[] = [];
  let total = 0;

  switch (kind) {
    case "LABA_RUGI": {
      const byAccount = new Map<string, number>();
      for (const l of inDim) {
        if (!REVENUE_PREFIXES.some((p) => l.accountCode.startsWith(p)) && !EXPENSE_PREFIXES.some((p) => l.accountCode.startsWith(p))) continue;
        const key = `${l.accountCode} ${l.accountName}`;
        byAccount.set(key, (byAccount.get(key) ?? 0) + amountOf(l));
      }
      for (const [label, amount] of byAccount) rows.push({ label, amount });
      const values = [...byAccount.values()];
      const keys = [...byAccount.keys()];
      const revenue = values.filter((_, i) => keys[i].startsWith("4-")).reduce((a, b) => a + b, 0);
      const expense = values.filter((_, i) => !keys[i].startsWith("4-")).reduce((a, b) => a + b, 0);
      rows.push({ label: "LABA (RUGI)", amount: revenue - expense });
      total = revenue - expense;
      break;
    }
    case "NERACA": {
      const byAccount = new Map<string, number>();
      for (const l of inDim) {
        const isBalance = [...ASSET_PREFIXES, ...LIABILITY_PREFIXES, ...EQUITY_PREFIXES].some((p) => l.accountCode.startsWith(p));
        if (!isBalance) continue;
        const key = `${l.accountCode} ${l.accountName}`;
        byAccount.set(key, (byAccount.get(key) ?? 0) + amountOf(l));
      }
      for (const [label, amount] of byAccount) rows.push({ label, amount });
      total = [...byAccount.values()].reduce((a, b) => a + b, 0);
      break;
    }
    case "ARUS_KAS": {
      const cashLines = inDim.filter((l) => l.accountCode.startsWith("1-1000") || l.accountCode.startsWith("1-1100"));
      const inflow = cashLines.reduce((s, l) => s + l.debit, 0);
      const outflow = cashLines.reduce((s, l) => s + l.credit, 0);
      rows.push({ label: "Arus kas masuk", amount: inflow });
      rows.push({ label: "Arus kas keluar", amount: -outflow });
      rows.push({ label: "ARUS KAS BERSIH", amount: inflow - outflow });
      total = inflow - outflow;
      break;
    }
    case "PENJUALAN":
    case "PENDAPATAN_PER_PROYEK":
    case "PENJUALAN_PER_CHANNEL":
    case "BEBAN":
    case "BEBAN_PER_CHANNEL": {
      const isExpense = kind === "BEBAN" || kind === "BEBAN_PER_CHANNEL";
      const prefixes = isExpense ? EXPENSE_PREFIXES : REVENUE_PREFIXES;
      const dimLines = inDim.filter((l) => prefixes.some((p) => l.accountCode.startsWith(p)));

      if (groupBy) {
        const groups = new Map<string, number>();
        for (const l of dimLines) {
          const key = groupBy === "project" ? l.dimension?.project ?? "(tanpa proyek)" : l.dimension?.channel ?? "(tanpa channel)";
          groups.set(key, (groups.get(key) ?? 0) + amountOf(l));
        }
        for (const [label, amount] of groups) rows.push({ label, amount });
        total = [...groups.values()].reduce((a, b) => a + b, 0);
      } else {
        const byAccount = new Map<string, number>();
        for (const l of dimLines) {
          const key = `${l.accountCode} ${l.accountName}`;
          byAccount.set(key, (byAccount.get(key) ?? 0) + amountOf(l));
        }
        for (const [label, amount] of byAccount) rows.push({ label, amount });
        total = [...byAccount.values()].reduce((a, b) => a + b, 0);
      }
      rows.push({ label: "TOTAL", amount: total });
      break;
    }
  }

  return { rows, total, filteredLines: inDim.length };
}

/** Laporan CSV (BOM UTF-8). */
export function customReportCsv(
  template: ReportTemplate,
  rows: ReportRow[],
  period: string,
  clientName: string,
): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [];
  lines.push(esc(`${template.name} — ${clientName} — ${period}`));
  if (template.description) lines.push(esc(template.description));
  if (template.dimensions?.project) lines.push(esc(`Filter proyek: ${template.dimensions.project}`));
  if (template.dimensions?.channel) lines.push(esc(`Filter channel: ${template.dimensions.channel}`));
  lines.push(["Label", "Jumlah"].map(esc).join(","));
  for (const r of rows) lines.push([r.label, r.amount.toFixed(2)].map(esc).join(","));
  return lines.join("\n");
}

// ── Wrapper DB ───────────────────────────────────────────────────────────────

/** Baris jurnal klien per periode beserta dimensi. */
export async function getJournalLinesWithDimensions(clientId: string, period: string): Promise<JournalLineForReport[]> {
  const p = /^(\d{4})-(\d{2})$/.exec(period);
  if (!p) throw new Error("Format periode: YYYY-MM.");
  const year = Number(p[1]);
  const month = Number(p[2]);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const journals = await prisma.journalEntry.findMany({
    where: { clientId, entryDate: { gte: start, lt: end } },
    select: {
      status: true,
      entryDate: true,
      lines: { select: { accountCode: true, accountName: true, debit: true, credit: true, dimension: true } },
    },
    orderBy: { entryDate: "asc" },
  });

  const rows: JournalLineForReport[] = [];
  for (const j of journals) {
    for (const l of j.lines) {
      rows.push({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: Number(l.debit),
        credit: Number(l.credit),
        dimension: (l.dimension as { project?: string; channel?: string } | null) ?? null,
        entryDate: j.entryDate.toISOString(),
        status: j.status,
      });
    }
  }
  return rows;
}

const TEMPLATE_PREFIX = "tmpl_";

/** Simpan template ke ClientProfile.reportTemplates (key = template.id). */
export async function saveReportTemplate(
  clientId: string,
  firmId: string,
  template: Omit<ReportTemplate, "id" | "createdAt">,
  actorId: string,
): Promise<ReportTemplate> {
  const profile = await prisma.clientProfile.findUnique({ where: { clientId } });
  if (!profile) throw new Error("Profil klien belum ada.");

  const id = TEMPLATE_PREFIX + Math.random().toString(36).slice(2, 10);
  const full: ReportTemplate = { ...template, id, createdAt: new Date().toISOString() };

  const current = (profile.reportTemplates ?? {}) as Record<string, unknown>;
  await prisma.clientProfile.update({
    where: { clientId },
    data: { reportTemplates: { ...current, [id]: full }, updatedById: actorId },
  });
  return full;
}

/** Daftar template dari profil klien. */
export async function listReportTemplates(clientId: string): Promise<ReportTemplate[]> {
  const profile = await prisma.clientProfile.findUnique({ where: { clientId } });
  const raw = (profile?.reportTemplates ?? {}) as Record<string, unknown>;
  return Object.values(raw).map((v) => v as ReportTemplate);
}

/** Hapus template (key = id). */
export async function deleteReportTemplate(clientId: string, templateId: string, actorId: string): Promise<void> {
  const profile = await prisma.clientProfile.findUnique({ where: { clientId } });
  if (!profile) throw new Error("Profil klien belum ada.");
  const current = (profile.reportTemplates ?? {}) as Record<string, unknown>;
  if (!(templateId in current)) throw new Error("Template tidak ditemukan.");
  const rest = Object.fromEntries(Object.entries(current).filter(([k]) => k !== templateId));
  await prisma.clientProfile.update({
    where: { clientId },
    data: { reportTemplates: rest, updatedById: actorId },
  });
}
