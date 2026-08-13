import { prisma } from "@/lib/db";
import { getTrialBalance } from "@/server/trial-balance";
import { buildMultiPeriodHighlights } from "@/server/multi-period";

async function main() {
  const client = await prisma.client.findFirst({ where: { name: "CV Berkah Abadi" } });
  if (!client) throw new Error("klien tidak ditemukan");
  const periods = ["2022-08", "2023-08", "2024-08", "2025-08", "2026-08"];
  const reports = await Promise.all(periods.map((p) => getTrialBalance(client!.id, client!.name, p)));
  const ranges = reports.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => ({ period: r.period, rows: r.rows }));
  console.log("periode dengan data:", ranges.map((r) => r.period).join(", "));
  const hl = buildMultiPeriodHighlights(client!.name, ranges);
  console.log("klien:", hl.clientName);
  for (const p of hl.periods) {
    console.log(`  ${p.period}: Penjualan ${(p.penjualanBersih/1e6).toFixed(0)}jt | LabaBersih ${(p.labaBersih/1e6).toFixed(0)}jt | Aset ${(p.totalAset/1e6).toFixed(0)}jt | GPM ${p.gpm?.toFixed(1)}% | NPM ${p.npm?.toFixed(1)}%`);
  }
}
main().finally(() => prisma.$disconnect());
