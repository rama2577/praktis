import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import type { DepreciationMethod, FixedAssetStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

const METHOD_MAP: Record<string, DepreciationMethod> = {
  garis_lurus: "STRAIGHT_LINE", "garis lurus": "STRAIGHT_LINE", straight_line: "STRAIGHT_LINE",
  saldo_menurun: "DECLINING_BALANCE", "saldo menurun": "DECLINING_BALANCE", declining_balance: "DECLINING_BALANCE",
};

const FISCAL_MAP: Record<string, string> = {
  k1: "K1", "kel 1": "K1", k2: "K2", "kel 2": "K2", k3: "K3", "kel 3": "K3", k4: "K4", "kel 4": "K4",
  bp: "BP", bangunan_permanen: "BP", bnp: "BNP", bangunan_tidak_permanen: "BNP",
};

export const POST = withTenantApi<Ctx>(async (request, ctx) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id: clientId } = await ctx.params;
  const client = await prisma.client.findFirst({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File wajib diunggah" }, { status: 400 });

  const text = await file.text();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return NextResponse.json({ error: "File kosong atau hanya header" }, { status: 400 });

  const header = lines[0]!.toLowerCase();
  const isCsv = file.name.endsWith(".csv");
  const sep = isCsv ? "," : "\t";

  const cols = header.split(sep);
  const idx = (keys: string[]) => cols.findIndex((c: string) => keys.some((k) => c.includes(k)));

  const iName = idx(["nama", "aset", "name"]);
  const iCat = idx(["kategori", "category"]);
  const iDate = idx(["tanggal", "perolehan", "purchase", "date", "tgl"]);
  const iCost = idx(["harga", "perolehan", "cost", "purchase", "nilai perolehan"]);
  const iResidual = idx(["residual", "sisa", "residu"]);
  const iMethod = idx(["metode", "method"]);
  const iLife = idx(["umur", "life", "masa manfaat", "bulan", "months"]);
  const iFiscal = idx(["fiskal", "fiscal", "kelompok", "group", "pasal"]);
  const iNotes = idx(["catatan", "notes", "keterangan"]);

  if (iName < 0 || iCost < 0) {
    return NextResponse.json({
      error: "Kolom wajib tidak ditemukan. Pastikan ada 'Nama Aset' dan 'Harga Perolehan'.",
      header: cols.join(", "),
    }, { status: 400 });
  }

  let created = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i]!.split(sep).map((v) => v.replace(/^"|"$/g, "").trim());
    if (vals.length < 2) continue;

    try {
      const name = vals[iName] || `Aset ${i}`;
      const category = (iCat >= 0 ? vals[iCat] : undefined) || "Peralatan";
      const dateStr = iDate >= 0 ? vals[iDate] : undefined;
      const purchaseDate = dateStr ? new Date(dateStr) : new Date();
      const purchaseCost = parseFloat((vals[iCost] || "0").replace(/[^0-9.-]/g, ""));
      const residualValue = iResidual >= 0 ? parseFloat((vals[iResidual] || "0").replace(/[^0-9.-]/g, "")) : 0;
      const methodRaw = (iMethod >= 0 ? vals[iMethod] : undefined) || "garis_lurus";
      const method: DepreciationMethod = METHOD_MAP[methodRaw.toLowerCase().replace(/ /g, "_")] || "STRAIGHT_LINE";
      const commercialLifeMonths = iLife >= 0 ? parseInt(vals[iLife] || "48", 10) : 48;
      const fiscalRaw = (iFiscal >= 0 ? vals[iFiscal] : undefined) || "K2";
      const fiscalGroup = FISCAL_MAP[fiscalRaw.toLowerCase()] || "K2";
      const notes = iNotes >= 0 ? vals[iNotes] : null;

      if (isNaN(purchaseCost) || purchaseCost <= 0) {
        errors.push(`Baris ${i + 1}: Harga perolehan tidak valid`);
        continue;
      }

      await prisma.fixedAsset.create({
        data: {
          firmId: client.firmId,
          clientId,
          name: name!,
          category,
          purchaseDate,
          purchaseCost,
          residualValue: isNaN(residualValue) ? 0 : residualValue,
          method,
          commercialLifeMonths: isNaN(commercialLifeMonths) ? 48 : commercialLifeMonths,
          fiscalGroup,
          notes: notes || null,
          status: "ACTIVE" as FixedAssetStatus,
        },
      });
      created++;
    } catch (e) {
      errors.push(`Baris ${i + 1}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    data: { created, errors: errors.length > 0 ? errors : undefined },
    message: `${created} aset berhasil didaftarkan${errors.length > 0 ? ` (${errors.length} error)` : ""}`,
  });
});
