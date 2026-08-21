import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { parseBankCsv, type BankTransaction } from "@/server/connectors";

/** POST /api/connectors/bank-import — upload CSV bank & parse transaksi. */
export const POST = withTenantApi(async (request) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data") && !contentType.includes("text/csv")) {
    return NextResponse.json({ error: "Upload CSV bank (multipart atau text/csv)" }, { status: 400 });
  }

  let csvText: string;
  if (contentType.includes("multipart")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "File CSV diperlukan" }, { status: 400 });
    if (!file.name.endsWith(".csv")) return NextResponse.json({ error: "Hanya file .csv" }, { status: 400 });
    csvText = await file.text();
  } else {
    csvText = await request.text();
  }

  const result = parseBankCsv(csvText);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Ringkasan transaksi
  const summary = summarize(result.transactions);

  return NextResponse.json({
    data: {
      format: result.format,
      total: result.transactions.length,
      summary,
      transactions: result.transactions.slice(0, 100), // max 100 di respons
    },
  });
});

function summarize(txs: BankTransaction[]) {
  let masuk = 0;
  let keluar = 0;
  let masukCount = 0;
  let keluarCount = 0;
  for (const t of txs) {
    if (t.amount >= 0) { masuk += t.amount; masukCount++; }
    else { keluar += Math.abs(t.amount); keluarCount++; }
  }
  return {
    masuk: { count: masukCount, total: Math.round(masuk) },
    keluar: { count: keluarCount, total: Math.round(keluar) },
    saldo: Math.round(masuk - keluar),
  };
}
