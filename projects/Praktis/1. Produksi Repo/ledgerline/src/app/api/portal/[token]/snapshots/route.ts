import { NextResponse } from "next/server";
import { validatePortalToken, listReportSnapshots } from "@/server/portal";
import { trialBalanceCsv, trialBalanceXlsx, type TrialBalanceReport } from "@/server/trial-balance";

type Ctx = { params: Promise<{ token: string }> };

/** GET /api/portal/[token]/snapshots — daftar versi laporan (K5); ?id=&format=csv|xlsx untuk unduh. */
export async function GET(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await validatePortalToken(token);
  if (!result) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const format = url.searchParams.get("format");

  const snapshots = await listReportSnapshots(result.client.id);

  if (id) {
    const snap = snapshots.find((s) => s.id === id);
    if (!snap) return NextResponse.json({ error: "Snapshot tidak ditemukan" }, { status: 404 });
    if (snap.type !== "TRIAL_BALANCE") {
      return NextResponse.json({ error: "Format unduh belum tersedia untuk tipe ini" }, { status: 400 });
    }

    const payload = snap.payload as unknown as TrialBalanceReport & { clientName: string; capturedAt?: string };
    const report: TrialBalanceReport = {
      clientId: result.client.id,
      clientName: payload.clientName ?? result.client.name,
      period: snap.period,
      prevPeriod: null,
      rows: payload.rows ?? [],
      totalDebit: payload.totalDebit ?? 0,
      totalCredit: payload.totalCredit ?? 0,
      balanced: payload.balanced ?? true,
      unusualCount: (payload.rows ?? []).filter((r) => r.unusual).length,
      periodStatus: "CLOSED",
    };

    if (format === "csv") {
      const csv = "\uFEFF" + trialBalanceCsv(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="neraca-percobaan-${snap.period}-v${snap.version}.csv"`,
        },
      });
    }
    if (format === "xlsx") {
      const buffer = await trialBalanceXlsx(report);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="neraca-percobaan-${snap.period}-v${snap.version}.xlsx"`,
        },
      });
    }
    return NextResponse.json({ data: { ...snap, payload } });
  }

  return NextResponse.json({
    data: snapshots.map((s) => ({
      id: s.id,
      period: s.period,
      type: s.type,
      version: s.version,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
