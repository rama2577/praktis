/**
 * GET /api/clients/[id]/spt-1771?year=2026&mode=31e|pp23|normal
 * Data SPT 1771: rekonsiliasi fiskal (Lampiran I), penyusutan (II), PPh (III).
 */
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import { prisma } from "@/lib/db";
import { buildSpt1771 } from "@/server/spt-1771";
import { isSptAnnualUnlocked } from "@/server/billing";
import { renderPdf, pdfResponse, xlsxBuffer, xlsxResponse } from "@/server/export";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  const { id } = await ctx.params;
  const year = parseInt(request.nextUrl.searchParams.get("year") ?? "", 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Parameter year wajib (YYYY)" }, { status: 400 });
  }
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode && !["31e", "pp23", "normal"].includes(mode)) {
    return NextResponse.json({ error: "Mode harus 31e | pp23 | normal" }, { status: 400 });
  }
  const client = await prisma.client.findFirst({
    where: { id, firmId: guard.session.user.firmId },
    select: { name: true },
  });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  // F-5 paywall: modul SPT Tahunan butuh langganan (annualPaidAt) saat BILLING_ENFORCE aktif.
  const unlocked = await isSptAnnualUnlocked(guard.session.user.firmId);
  if (!unlocked) {
    return NextResponse.json(
      { error: "Modul SPT Tahunan terkunci — butuh langganan SPT Tahunan (annualPaidAt)." },
      { status: 402 },
    );
  }
  const data = await buildSpt1771(id, client.name, year, (mode as "31e" | "pp23" | "normal") ?? "31e");

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const rekRows = [
    ...data.pendapatan.map((r) => [r.kode, r.nama, r.komersial, r.koreksiPositif, r.koreksiNegatif, r.fiskal] as (string | number)[]),
    ...data.beban.map((r) => [r.kode, r.nama, r.komersial, r.koreksiPositif, r.koreksiNegatif, r.fiskal] as (string | number)[]),
  ];

  if (format === "pdf") {
    const buffer = await renderPdf({
      title: `SPT 1771 — ${data.clientName}`,
      subtitle: `Tahun Pajak ${data.year} · Mode ${data.mode}`,
      tables: [
        {
          title: "Lampiran I — Rekonsiliasi Fiskal",
          columns: [
            { header: "Kode", ratio: 1.0 },
            { header: "Uraian", ratio: 2.6 },
            { header: "Komersial", align: "right", ratio: 1.4 },
            { header: "Koreksi +", align: "right", ratio: 1.2 },
            { header: "Koreksi −", align: "right", ratio: 1.2 },
            { header: "Fiskal", align: "right", ratio: 1.4 },
          ],
          rows: rekRows,
          footer: [
            `Laba Komersial: ${data.labaKomersial.toLocaleString("id-ID")}`,
            `Koreksi Positif: ${data.totalKoreksiPositif.toLocaleString("id-ID")}  ·  Koreksi Negatif: ${data.totalKoreksiNegatif.toLocaleString("id-ID")}`,
            `Laba Fiskal: ${data.labaFiskal.toLocaleString("id-ID")}  ·  Peredaran Bruto: ${data.peredaranBruto.toLocaleString("id-ID")}`,
          ],
        },
        {
          title: "Lampiran II — Penyusutan Fiskal",
          columns: [
            { header: "Aset", ratio: 1.2 },
            { header: "Nama", ratio: 2.4 },
            { header: "Kelompok", ratio: 1.4 },
            { header: "Komersial", align: "right", ratio: 1.4 },
            { header: "Fiskal", align: "right", ratio: 1.4 },
            { header: "Koreksi", align: "right", ratio: 1.4 },
          ],
          rows: data.penyusutan.map((p) => [p.assetCode, p.assetName, p.kelompok, p.komersial, p.fiskal, p.koreksi]),
          footer: [`Total Koreksi Penyusutan: ${data.koreksiPenyusutan.toLocaleString("id-ID")}`],
        },
        {
          title: "Lampiran III — PPh Terutang",
          columns: [
            { header: "Keterangan", ratio: 3.0 },
            { header: "Jumlah (Rp)", align: "right", ratio: 2.0 },
          ],
          rows: [
            ["Penghasilan Kena Pajak (PKP)", data.pkp],
            ["Tarif PPh", `${(data.tarifPph * 100).toFixed(0)}%`],
            ["PPh Terutang", data.pphTerutang],
            ["Kredit Pajak", data.kreditPajak],
            ["PPh Kurang Bayar", data.pphKurangBayar],
          ],
          footer: data.catatan,
        },
      ],
    });
    return pdfResponse(buffer, `spt-1771-${data.year}.pdf`);
  }

  if (format === "xlsx") {
    const buffer = await xlsxBuffer([
      {
        name: "Lampiran I",
        columns: [
          { header: "Kode", key: "kode", width: 10 },
          { header: "Uraian", key: "nama", width: 48 },
          { header: "Komersial", key: "komersial", width: 18 },
          { header: "Koreksi +", key: "koreksiPositif", width: 14 },
          { header: "Koreksi −", key: "koreksiNegatif", width: 14 },
          { header: "Fiskal", key: "fiskal", width: 18 },
        ],
        rows: [...data.pendapatan, ...data.beban].map((r) => ({
          kode: r.kode,
          nama: r.nama,
          komersial: r.komersial,
          koreksiPositif: r.koreksiPositif,
          koreksiNegatif: r.koreksiNegatif,
          fiskal: r.fiskal,
        })),
      },
      {
        name: "Lampiran II",
        columns: [
          { header: "Aset", key: "assetCode", width: 12 },
          { header: "Nama", key: "assetName", width: 40 },
          { header: "Kelompok", key: "kelompok", width: 16 },
          { header: "Komersial", key: "komersial", width: 16 },
          { header: "Fiskal", key: "fiskal", width: 16 },
          { header: "Koreksi", key: "koreksi", width: 16 },
        ],
        rows: data.penyusutan.map((p) => ({
          assetCode: p.assetCode,
          assetName: p.assetName,
          kelompok: p.kelompok,
          komersial: p.komersial,
          fiskal: p.fiskal,
          koreksi: p.koreksi,
        })),
      },
      {
        name: "Lampiran III",
        columns: [
          { header: "Keterangan", key: "label", width: 36 },
          { header: "Jumlah", key: "value", width: 20 },
        ],
        rows: [
          { label: "Laba Fiskal", value: data.labaFiskal },
          { label: "PKP", value: data.pkp },
          { label: "Tarif PPh", value: `${(data.tarifPph * 100).toFixed(0)}%` },
          { label: "PPh Terutang", value: data.pphTerutang },
          { label: "Kredit Pajak", value: data.kreditPajak },
          { label: "PPh Kurang Bayar", value: data.pphKurangBayar },
        ],
      },
    ]);
    return xlsxResponse(buffer, `spt-1771-${data.year}.xlsx`);
  }

  return NextResponse.json({ data });
});
