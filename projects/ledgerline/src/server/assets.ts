/**
 * F5A — Aset tetap & penyusutan (M8).
 * Inti murni & deterministik (testable): komersial PSAK 216 (garis lurus /
 * saldo menurun) + fiskal Pasal 11 (kelompok 4/8/16/20 th), jurnal ADJUSTING
 * otomatis per periode, register & rekonsiliasi fiskal.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { FixedAsset, JournalType } from "@prisma/client";

// ── Konstanta ───────────────────────────────────────────────────────────────

/** Kelompok fiskal Pasal 11 UU PPh — umur manfaat (bulan). */
export const FISCAL_GROUPS: Record<string, { label: string; months: number }> = {
  K1: { label: "Kelompok 1 (4 tahun)", months: 48 },
  K2: { label: "Kelompok 2 (8 tahun)", months: 96 },
  K3: { label: "Kelompok 3 (16 tahun)", months: 192 },
  K4: { label: "Kelompok 4 (20 tahun)", months: 240 },
  BP: { label: "Bangunan Permanen (20 tahun)", months: 240 },
  BNP: { label: "Bangunan Non-Permanen (10 tahun)", months: 120 },
};

export const DEPRECIATION_COA = {
  expenseCode: "5-1500",
  expenseName: "Beban Penyusutan",
  accumCode: "1-1500",
  accumName: "Akumulasi Penyusutan",
} as const;

export function fiscalGroupMonths(group: string): number {
  return FISCAL_GROUPS[group]?.months ?? 0;
}

export function fiscalGroupLabel(group: string): string {
  return FISCAL_GROUPS[group]?.label ?? group;
}

// ── Utilitas periode ─────────────────────────────────────────────────────────

/** "2026-08" → {year, month} (1-based). Invalid → null. */
export function parsePeriod(period: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** Jumlah bulan dari tanggal perolehan s.d. periode (inklusif; minimum 0). */
export function monthsElapsed(purchaseDate: Date, period: string): number {
  const p = parsePeriod(period);
  if (!p) return 0;
  const start = new Date(purchaseDate);
  const elapsed = (p.year - start.getFullYear()) * 12 + (p.month - (start.getMonth() + 1)) + 1;
  return Math.max(0, elapsed);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Perhitungan penyusutan (pure) ───────────────────────────────────────────

export type DepreciationInput = {
  purchaseCost: number;
  residualValue: number;
  method: "STRAIGHT_LINE" | "DECLINING_BALANCE";
  commercialLifeMonths: number;
  fiscalGroup: string;
  purchaseDate: Date;
  period: string;
  /** Akumulasi komersial akhir periode sebelumnya (untuk saldo menurun & kumulatif). */
  prevCommercial?: number;
  prevFiscal?: number;
};

export type DepreciationResult = {
  monthsElapsed: number;
  commercialAmount: number;
  fiscalAmount: number;
  accumulatedCommercial: number;
  accumulatedFiscal: number;
  bookValueCommercial: number;
  bookValueFiscal: number;
  fullyDepreciated: boolean;
};

/** Penyusutan satu bulan untuk periode tertentu (komersial + fiskal). */
export function computeDepreciation(input: DepreciationInput): DepreciationResult {
  const { purchaseCost, residualValue, method, commercialLifeMonths, fiscalGroup, purchaseDate, period } = input;
  const elapsed = monthsElapsed(purchaseDate, period);
  const prevCommercial = input.prevCommercial ?? 0;
  const prevFiscal = input.prevFiscal ?? 0;
  const fiscalMonths = fiscalGroupMonths(fiscalGroup);
  const depreciable = Math.max(0, purchaseCost - residualValue);

  // Komersial — PSAK 216
  let commercialAmount = 0;
  if (elapsed >= 1 && elapsed <= commercialLifeMonths && depreciable > 0) {
    if (method === "DECLINING_BALANCE") {
      const years = commercialLifeMonths / 12;
      const annualRate = years > 0 ? 2 / years : 0;
      const monthlyRate = annualRate / 12;
      const remaining = Math.max(0, depreciable - prevCommercial);
      commercialAmount = round2(Math.min(remaining, (purchaseCost - prevCommercial) * monthlyRate));
    } else {
      commercialAmount = round2(depreciable / commercialLifeMonths);
    }
  }
  const accumulatedCommercial = round2(Math.min(prevCommercial + commercialAmount, depreciable));
  const bookValueCommercial = round2(purchaseCost - accumulatedCommercial);

  // Fiskal — Pasal 11 (garis lurus, tanpa nilai sisa)
  let fiscalAmount = 0;
  if (elapsed >= 1 && elapsed <= fiscalMonths && purchaseCost > 0) {
    fiscalAmount = round2(purchaseCost / fiscalMonths);
  }
  const accumulatedFiscal = round2(Math.min(prevFiscal + fiscalAmount, purchaseCost));
  const bookValueFiscal = round2(purchaseCost - accumulatedFiscal);

  return {
    monthsElapsed: elapsed,
    commercialAmount,
    fiscalAmount,
    accumulatedCommercial,
    accumulatedFiscal,
    bookValueCommercial,
    bookValueFiscal,
    fullyDepreciated: accumulatedCommercial >= depreciable && depreciable > 0,
  };
}

/** Baris jurnal penyusutan (debit beban / kredit akumulasi) — selalu balance. */
export function depreciationJournalLines(asset: {
  name: string;
}, amount: number): { accountCode: string; accountName: string; debit: number; credit: number; notes?: string }[] {
  return [
    {
      accountCode: DEPRECIATION_COA.expenseCode,
      accountName: `${DEPRECIATION_COA.expenseName} — ${asset.name}`,
      debit: round2(amount),
      credit: 0,
      notes: "Penyusutan aset tetap",
    },
    {
      accountCode: DEPRECIATION_COA.accumCode,
      accountName: `${DEPRECIATION_COA.accumName} — ${asset.name}`,
      debit: 0,
      credit: round2(amount),
    },
  ];
}

// ── Operasi DB (wrapper) ─────────────────────────────────────────────────────

const ASSET_INCLUDE = {
  schedules: { orderBy: { period: "asc" as const } },
} satisfies Prisma.FixedAssetInclude;

function toAssetDto(asset: FixedAsset & { schedules: { period: string; commercialAmount: Prisma.Decimal; accumulatedCommercial: Prisma.Decimal; bookValueCommercial: Prisma.Decimal }[] }) {
  const last = asset.schedules[asset.schedules.length - 1];
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    purchaseDate: asset.purchaseDate.toISOString(),
    purchaseCost: Number(asset.purchaseCost),
    residualValue: Number(asset.residualValue),
    method: asset.method,
    commercialLifeMonths: asset.commercialLifeMonths,
    fiscalGroup: asset.fiscalGroup,
    fiscalGroupLabel: fiscalGroupLabel(asset.fiscalGroup),
    status: asset.status,
    notes: asset.notes,
    lastPeriod: last?.period ?? null,
    accumulatedCommercial: last ? Number(last.accumulatedCommercial) : 0,
    bookValueCommercial: last ? Number(last.bookValueCommercial) : Number(asset.purchaseCost),
  };
}

/** Register aset klien + nilai buku terakhir. */
export async function getAssetRegister(clientId: string) {
  const assets = await prisma.fixedAsset.findMany({
    where: { clientId },
    include: ASSET_INCLUDE,
    orderBy: { purchaseDate: "desc" },
  });
  return assets.map(toAssetDto);
}

/** Detail aset + jadwal penyusutan. */
export async function getAssetDetail(assetId: string, clientId: string) {
  const asset = await prisma.fixedAsset.findFirst({
    where: { id: assetId, clientId },
    include: ASSET_INCLUDE,
  });
  if (!asset) return null;
  return {
    ...toAssetDto(asset),
    schedules: asset.schedules.map((s) => ({
      id: s.id,
      period: s.period,
      commercialAmount: Number(s.commercialAmount),
      fiscalAmount: Number(s.fiscalAmount),
      accumulatedCommercial: Number(s.accumulatedCommercial),
      accumulatedFiscal: Number(s.accumulatedFiscal),
      bookValueCommercial: Number(s.bookValueCommercial),
      bookValueFiscal: Number(s.bookValueFiscal),
      journalEntryId: s.journalEntryId,
    })),
  };
}

export type CreateAssetInput = {
  firmId: string;
  clientId: string;
  name: string;
  category: string;
  purchaseDate: Date;
  purchaseCost: number;
  residualValue: number;
  method: "STRAIGHT_LINE" | "DECLINING_BALANCE";
  commercialLifeMonths: number;
  fiscalGroup: string;
  notes?: string;
};

/** Buat aset baru dengan validasi (throw Error pesan Indonesia). */
export async function createFixedAsset(input: CreateAssetInput) {
  const { name, category, purchaseCost, residualValue, method, commercialLifeMonths, fiscalGroup } = input;
  if (!name.trim()) throw new Error("Nama aset wajib diisi.");
  if (!category.trim()) throw new Error("Kategori aset wajib diisi.");
  if (!Number.isFinite(purchaseCost) || purchaseCost <= 0) throw new Error("Biaya perolehan harus lebih dari 0.");
  if (!Number.isFinite(residualValue) || residualValue < 0) throw new Error("Nilai sisa tidak boleh negatif.");
  if (residualValue >= purchaseCost) throw new Error("Nilai sisa harus lebih kecil dari biaya perolehan.");
  if (!Number.isInteger(commercialLifeMonths) || commercialLifeMonths < 1 || commercialLifeMonths > 600) {
    throw new Error("Umur manfaat komersial harus 1–600 bulan.");
  }
  if (!FISCAL_GROUPS[fiscalGroup]) {
    throw new Error("Kelompok fiskal tidak valid. Pilih K1, K2, K3, K4, BP, atau BNP.");
  }

  return prisma.fixedAsset.create({
    data: {
      firmId: input.firmId,
      clientId: input.clientId,
      name: name.trim(),
      category: category.trim(),
      purchaseDate: input.purchaseDate,
      purchaseCost: new Prisma.Decimal(purchaseCost),
      residualValue: new Prisma.Decimal(residualValue),
      method,
      commercialLifeMonths,
      fiscalGroup,
      notes: input.notes?.trim() || null,
    },
  });
}

export type DepreciateResult = {
  assetId: string;
  name: string;
  period: string;
  commercialAmount: number;
  fiscalAmount: number;
  journalId: string | null;
  skipped: boolean;
};

/**
 * Hitung & catat penyusutan semua aset aktif klien untuk satu periode.
 * Buat baris DepreciationSchedule + jurnal ADJUSTING APPROVED (deterministik)
 * dalam satu transaksi. Idempotent per (aset, periode).
 */
export async function depreciateClientPeriod(
  clientId: string,
  firmId: string,
  period: string,
  actorId: string,
): Promise<DepreciateResult[]> {
  const p = parsePeriod(period);
  if (!p) throw new Error("Format periode: YYYY-MM.");

  const assets = await prisma.fixedAsset.findMany({
    where: { clientId, firmId, status: "ACTIVE" },
    orderBy: { purchaseDate: "asc" },
  });
  if (assets.length === 0) throw new Error("Tidak ada aset aktif untuk klien ini.");

  const results: DepreciateResult[] = [];
  await prisma.$transaction(async (tx) => {
    for (const asset of assets) {
      const existing = await tx.depreciationSchedule.findUnique({
        where: { assetId_period: { assetId: asset.id, period } },
      });
      if (existing) {
        results.push({
          assetId: asset.id,
          name: asset.name,
          period,
          commercialAmount: 0,
          fiscalAmount: 0,
          journalId: existing.journalEntryId,
          skipped: true,
        });
        continue;
      }

      const prev = await tx.depreciationSchedule.findFirst({
        where: { assetId: asset.id, period: { lt: period } },
        orderBy: { period: "desc" },
      });

      const calc = computeDepreciation({
        purchaseCost: Number(asset.purchaseCost),
        residualValue: Number(asset.residualValue),
        method: asset.method,
        commercialLifeMonths: asset.commercialLifeMonths,
        fiscalGroup: asset.fiscalGroup,
        purchaseDate: asset.purchaseDate,
        period,
        prevCommercial: prev ? Number(prev.accumulatedCommercial) : 0,
        prevFiscal: prev ? Number(prev.accumulatedFiscal) : 0,
      });

      let journalId: string | null = null;
      if (calc.commercialAmount > 0) {
        // UTC noon agar periodOf() (UTC) selalu mengklasifikasikan ke bulan yang benar.
        const entryDate = new Date(Date.UTC(p.year, p.month - 1, 1, 12));
        const lines = depreciationJournalLines(asset, calc.commercialAmount);
        const journal = await tx.journalEntry.create({
          data: {
            firmId,
            clientId,
            assetId: asset.id,
            status: "APPROVED",
            confidence: 1,
            description: `Penyusutan ${asset.name} — ${period}`,
            createdByAi: true,
            journalType: "ADJUSTING" as JournalType,
            entryDate,
            lines: {
              create: lines.map((l) => ({
                accountCode: l.accountCode,
                accountName: l.accountName,
                debit: new Prisma.Decimal(l.debit),
                credit: new Prisma.Decimal(l.credit),
                notes: l.notes ?? null,
              })),
            },
            activities: {
              create: {
                firmId,
                userId: actorId,
                action: "JOURNAL_CREATED",
                detail: `Penyusutan ${asset.name} — ${period} (${calc.commercialAmount})`,
              },
            },
          },
        });
        journalId = journal.id;
      }

      const schedule = await tx.depreciationSchedule.create({
        data: {
          assetId: asset.id,
          period,
          commercialAmount: new Prisma.Decimal(calc.commercialAmount),
          fiscalAmount: new Prisma.Decimal(calc.fiscalAmount),
          accumulatedCommercial: new Prisma.Decimal(calc.accumulatedCommercial),
          accumulatedFiscal: new Prisma.Decimal(calc.accumulatedFiscal),
          bookValueCommercial: new Prisma.Decimal(calc.bookValueCommercial),
          bookValueFiscal: new Prisma.Decimal(calc.bookValueFiscal),
          journalEntryId: journalId,
        },
      });
      results.push({
        assetId: asset.id,
        name: asset.name,
        period,
        commercialAmount: Number(schedule.commercialAmount),
        fiscalAmount: Number(schedule.fiscalAmount),
        journalId,
        skipped: false,
      });
    }
  });

  return results;
}

/** Laporan rekonsiliasi fiskal per periode: nilai buku komersial vs fiskal. */
export async function getAssetReconciliation(clientId: string, period: string) {
  const p = parsePeriod(period);
  if (!p) throw new Error("Format periode: YYYY-MM.");

  const assets = await prisma.fixedAsset.findMany({
    where: { clientId },
    include: {
      schedules: {
        where: { period: { lte: period } },
        orderBy: { period: "desc" },
        take: 1,
      },
    },
    orderBy: { purchaseDate: "asc" },
  });

  const rows = assets.map((asset) => {
    const s = asset.schedules[0];
    return {
      assetId: asset.id,
      name: asset.name,
      category: asset.category,
      purchaseDate: asset.purchaseDate.toISOString(),
      purchaseCost: Number(asset.purchaseCost),
      fiscalGroup: asset.fiscalGroup,
      fiscalGroupLabel: fiscalGroupLabel(asset.fiscalGroup),
      period: s?.period ?? null,
      accumulatedCommercial: s ? Number(s.accumulatedCommercial) : 0,
      accumulatedFiscal: s ? Number(s.accumulatedFiscal) : 0,
      bookValueCommercial: s ? Number(s.bookValueCommercial) : Number(asset.purchaseCost),
      bookValueFiscal: s ? Number(s.bookValueFiscal) : Number(asset.purchaseCost),
      // Beda temporer: nilai buku komersial − nilai buku fiskal (dasar pajak tangguhan)
      temporaryDifference: s ? Number(s.bookValueCommercial) - Number(s.bookValueFiscal) : 0,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      purchaseCost: acc.purchaseCost + r.purchaseCost,
      bookValueCommercial: acc.bookValueCommercial + r.bookValueCommercial,
      bookValueFiscal: acc.bookValueFiscal + r.bookValueFiscal,
      temporaryDifference: acc.temporaryDifference + r.temporaryDifference,
    }),
    { purchaseCost: 0, bookValueCommercial: 0, bookValueFiscal: 0, temporaryDifference: 0 },
  );

  return { period, rows, totals };
}

/** CSV rekonsiliasi (BOM UTF-8 agar Excel membaca aksara Indonesia). */
export function assetReconciliationCsv(report: Awaited<ReturnType<typeof getAssetReconciliation>>): string {
  const header = ["Aset", "Kategori", "Tanggal Perolehan", "Biaya Perolehan", "Kelompok Fiskal", "Akum. Komersial", "Akum. Fiskal", "Nilai Buku Komersial", "Nilai Buku Fiskal", "Beda Temporer"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = report.rows.map((r) =>
    [r.name, r.category, r.purchaseDate.slice(0, 10), r.purchaseCost, r.fiscalGroup, r.accumulatedCommercial, r.accumulatedFiscal, r.bookValueCommercial, r.bookValueFiscal, r.temporaryDifference]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
