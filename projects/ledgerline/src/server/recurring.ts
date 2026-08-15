import { prisma } from "@/lib/db";

/**
 * T3.2 — Jurnal rutin otomatis: usulkan jurnal berulang (sewa, gaji, depresiasi)
 * berdasarkan sinyal data klien. Deterministik — saran, bukan final (akuntan setuju).
 */

export type RecurringSuggestion = {
  kind: "sewa" | "gaji" | "depresiasi" | "lainnya";
  label: string;
  clientName: string;
  debit: string;
  credit: string;
  basis: string;
};

const RENT_ACCOUNT_HINTS = /sewa|rent|biaya bangunan|biaya kantor/i;
const PAYROLL_HINTS = /gaji|payroll|upah|karyawan|bpjs/i;

/** Deteksi jenis jurnal rutin dari daftar nama akun (pure — testable). */
export function detectRecurringKind(accountNames: string[]): RecurringSuggestion["kind"] | null {
  const joined = accountNames.join(" ");
  if (RENT_ACCOUNT_HINTS.test(joined)) return "sewa";
  if (PAYROLL_HINTS.test(joined)) return "gaji";
  return null;
}

/** Usulkan jurnal rutin untuk klien aktif berdasarkan akun & aset tetap. */
export async function suggestRecurringJournals(firmId: string): Promise<RecurringSuggestion[]> {
  const clients = await prisma.client.findMany({
    where: { firmId, status: "ACTIVE" },
    include: {
      fixedAssets: { where: { status: "ACTIVE" }, select: { name: true } },
      journals: {
        where: { status: { in: ["APPROVED", "DRAFT"] } },
        select: { lines: { select: { accountName: true }, take: 20 } },
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const out: RecurringSuggestion[] = [];
  for (const c of clients) {
    const accountNames = c.journals.flatMap((j) => j.lines.map((l) => l.accountName));
    const kind = detectRecurringKind(accountNames);
    if (kind === "sewa") {
      out.push({
        kind,
        label: "Beban Sewa bulanan",
        clientName: c.name,
        debit: "Beban Sewa",
        credit: "Kas/Bank",
        basis: "akun sewa terdeteksi di jurnal",
      });
    }
    if (kind === "gaji") {
      out.push({
        kind,
        label: "Beban Gaji & BPJS bulanan",
        clientName: c.name,
        debit: "Beban Gaji",
        credit: "Kas/Bank",
        basis: "akun gaji/BPJS terdeteksi di jurnal",
      });
    }
    for (const asset of c.fixedAssets) {
      out.push({
        kind: "depresiasi",
        label: `Depresiasi ${asset.name}`,
        clientName: c.name,
        debit: "Beban Depresiasi",
        credit: "Akumulasi Depresiasi",
        basis: "aset tetap aktif",
      });
    }
  }
  return out.slice(0, 20);
}
