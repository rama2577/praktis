import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { withTenantApi } from "@/lib/tenant-api";
import ExcelJS from "exceljs";

/**
 * GET /api/connectors/template?industry=retail|fnb|services
 * Download XLSX template COA + format laporan per industri.
 * Untuk onboarding klien < 15 menit (EN-09).
 */
export const GET = withTenantApi(async (request) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const url = new URL(request.url);
  const industry = url.searchParams.get("industry") ?? "retail";
  const template = getTemplate(industry);

  const wb = new ExcelJS.Workbook();

  // Sheet 1: COA Mapping
  const coaSheet = wb.addWorksheet("COA Mapping");
  coaSheet.addRow(["Kode Klien", "Nama Akun Klien", "Kode Standar", "Nama Akun Standar", "Kategori"]);
  for (const r of template.coa) coaSheet.addRow([r.clientCode, r.clientName, r.standardCode, r.standardName, r.category]);

  // Sheet 2: Format Laporan
  const reportSheet = wb.addWorksheet("Format Laporan");
  reportSheet.addRow(["Jenis Laporan", "Format", "Periode"]);
  reportSheet.addRow(["Laba Rugi", template.reportFormat, "Bulanan"]);
  reportSheet.addRow(["Neraca", template.reportFormat, "Bulanan"]);
  reportSheet.addRow(["Arus Kas", template.reportFormat, "Bulanan"]);

  // Sheet 3: Panduan
  const guideSheet = wb.addWorksheet("Panduan");
  guideSheet.addRow(["Panduan Pengisian Template"]);
  guideSheet.addRow(["1. Isi kolom 'Kode Klien' dan 'Nama Akun Klien' sesuai COA perusahaan klien"]);
  guideSheet.addRow(["2. Kolom 'Kode Standar' dan 'Nama Akun Standar' adalah referensi — jangan diubah"]);
  guideSheet.addRow(["3. Upload file ini di halaman Profil Klien untuk belajar mapping otomatis"]);
  guideSheet.addRow(["4. AI (Praktis) akan mengenali format laporan klien setelah 1-2 periode"]);
  guideSheet.addRow([""]);
  guideSheet.addRow(["Butuh bantuan? Hubungi tim support Praktis."]);

  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template-onboarding-${industry}.xlsx"`,
    },
  });
});

type IndustryTemplate = {
  coa: Array<{ clientCode: string; clientName: string; standardCode: string; standardName: string; category: string }>;
  reportFormat: string;
};

function getTemplate(industry: string): IndustryTemplate {
  const templates: Record<string, IndustryTemplate> = {
    retail: {
      reportFormat: "Penjualan bersih, HPP, Beban operasional, Laba bersih",
      coa: [
        { clientCode: "", clientName: "", standardCode: "1101", standardName: "Kas", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "1102", standardName: "Bank", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "1201", standardName: "Piutang Usaha", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "1301", standardName: "Persediaan", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "4101", standardName: "Penjualan", category: "Pendapatan" },
        { clientCode: "", clientName: "", standardCode: "5101", standardName: "HPP", category: "HPP" },
        { clientCode: "", clientName: "", standardCode: "6101", standardName: "Beban Gaji", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "6102", standardName: "Beban Sewa", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "6103", standardName: "Beban Listrik/Air", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "2201", standardName: "PPN Keluaran", category: "Liabilitas" },
      ],
    },
    fnb: {
      reportFormat: "Penjualan, HPP (bahan baku), Beban operasional, Laba bersih",
      coa: [
        { clientCode: "", clientName: "", standardCode: "1101", standardName: "Kas", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "1102", standardName: "Bank", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "1301", standardName: "Persediaan Bahan Baku", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "4101", standardName: "Penjualan Makanan", category: "Pendapatan" },
        { clientCode: "", clientName: "", standardCode: "4102", standardName: "Penjualan Minuman", category: "Pendapatan" },
        { clientCode: "", clientName: "", standardCode: "5101", standardName: "HPP Bahan Baku", category: "HPP" },
        { clientCode: "", clientName: "", standardCode: "6101", standardName: "Beban Gaji", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "6102", standardName: "Beban Sewa", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "6104", standardName: "Beban Gas/Listrik", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "2201", standardName: "PPN Keluaran", category: "Liabilitas" },
      ],
    },
    services: {
      reportFormat: "Pendapatan jasa, Beban operasional, Laba bersih",
      coa: [
        { clientCode: "", clientName: "", standardCode: "1101", standardName: "Kas", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "1102", standardName: "Bank", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "1201", standardName: "Piutang Usaha", category: "Aset Lancar" },
        { clientCode: "", clientName: "", standardCode: "4101", standardName: "Pendapatan Jasa", category: "Pendapatan" },
        { clientCode: "", clientName: "", standardCode: "4102", standardName: "Pendapatan Konsultasi", category: "Pendapatan" },
        { clientCode: "", clientName: "", standardCode: "6101", standardName: "Beban Gaji", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "6102", standardName: "Beban Sewa", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "6105", standardName: "Beban Internet/Telepon", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "6106", standardName: "Beban Transportasi", category: "Beban" },
        { clientCode: "", clientName: "", standardCode: "2201", standardName: "PPN Keluaran", category: "Liabilitas" },
      ],
    },
  };
  return templates[industry] ?? templates.retail;
}
