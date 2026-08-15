import type { ClientProfile, ProfileStatus, Industry } from "@prisma/client";
import { prisma } from "@/lib/db";
import { chatJsonWithFallback } from "@/ai/llm";

/**
 * EN-02 — Client Profile: klien dengan COA/laporan baku langsung dikenali AI.
 *
 * Alur onboarding:
 * 1. Upload daftar akun/COA klien (XLSX/CSV/teks) → `learnMappingFromText`
 *    → GLM ekstrak mapping kode klien → COA standar → status REVIEW
 * 2. Senior memeriksa mapping (`approveClientProfile`) → READY
 * 3. Pipeline membaca profile READY → prompt drafting mendapat hint COA klien
 *    → transaksi baru langsung terklasifikasi benar (first-pass rate naik).
 */

export type CoaMappingValue = {
  accountCode: string; // kode COA standar
  accountName: string; // nama akun standar
  note?: string;
};

export type CoaMapping = Record<string, CoaMappingValue>;

/** Ambil profil klien (null jika belum ada). */
export async function getClientProfile(clientId: string): Promise<ClientProfile | null> {
  return prisma.clientProfile.findUnique({ where: { clientId } });
}

/** Validasi shape coaMapping (pure, unit-testable). */
export function isValidCoaMapping(value: unknown): value is CoaMapping {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return false;
  return entries.every(([, v]) => {
    if (typeof v !== "object" || v === null) return false;
    const m = v as Record<string, unknown>;
    return typeof m.accountCode === "string" && typeof m.accountName === "string";
  });
}

/** Buat/update profil klien (manual/parsed). */
export async function upsertClientProfile(input: {
  clientId: string;
  firmId: string;
  coaMapping?: unknown;
  reportTemplates?: unknown;
  rules?: unknown;
  mappingStatus?: ProfileStatus;
  sourcePeriod?: string | null;
  updatedById?: string;
}): Promise<ClientProfile> {
  if (input.coaMapping !== undefined && !isValidCoaMapping(input.coaMapping)) {
    throw new Error("coaMapping tidak valid — butuh { kodeKlien: { accountCode, accountName } }");
  }
  const data = {
    firmId: input.firmId,
    ...(input.coaMapping !== undefined ? { coaMapping: input.coaMapping as object } : {}),
    ...(input.reportTemplates !== undefined ? { reportTemplates: input.reportTemplates as object } : {}),
    ...(input.rules !== undefined ? { rules: input.rules as object } : {}),
    ...(input.mappingStatus !== undefined ? { mappingStatus: input.mappingStatus } : {}),
    ...(input.sourcePeriod !== undefined ? { sourcePeriod: input.sourcePeriod } : {}),
    ...(input.updatedById !== undefined ? { updatedById: input.updatedById } : {}),
  };
  return prisma.clientProfile.upsert({
    where: { clientId: input.clientId },
    create: {
      clientId: input.clientId,
      firmId: input.firmId,
      coaMapping: (input.coaMapping as object) ?? {},
      reportTemplates: (input.reportTemplates as object) ?? {},
      rules: (input.rules as object) ?? {},
      mappingStatus: input.mappingStatus ?? "NONE",
      sourcePeriod: input.sourcePeriod ?? null,
      updatedById: input.updatedById,
    },
    update: data,
  });
}

/**
 * Belajar mapping dari daftar akun klien (teks hasil parse XLSX/CSV).
 * GLM (glm-4-flash, gratis) mengekstrak: kode akun klien → COA standar
 * Indonesia (PSAK). Hasil disimpan dengan status REVIEW — butuh persetujuan
 * senior sebelum dipakai pipeline.
 */
export async function learnMappingFromText(input: {
  clientId: string;
  firmId: string;
  rawAccountList: string; // teks daftar akun klien (maks ~8.000 char)
  sourcePeriod?: string;
  updatedById?: string;
}): Promise<ClientProfile> {
  const system = `Kamu adalah akuntan Indonesia. Klien kantor akuntan memberikan daftar akun (COA) mereka sendiri.
Tugas: petakan SETIAP akun klien ke akun COA standar Indonesia (PSAK).

Aturan:
1. accountCode/accountName = kode & nama akun STANDAR (mis. 1101 Kas, 4101 Pendapatan Penjualan).
2. Jangan mengarang akun standar baru — gunakan penamaan umum buku besar Indonesia.
3. Jika akun klien tidak jelas, tetap petakan ke akun paling masuk akal dan tambahkan note.
4. RESPONS JSON saja (tanpa markdown):
{ "mapping": { "kodeKlien": { "accountCode": "1101", "accountName": "Kas", "note": "opsional" } } }`;

  const { json } = await chatJsonWithFallback({
    system,
    user: `DAFTAR AKUN KLIEN (format: kode | nama):\n${input.rawAccountList.slice(0, 8000)}`,
    timeoutMs: 90_000,
  });

  const parsed = json as { mapping?: unknown };
  const mapping = parsed.mapping ?? {};
  if (!isValidCoaMapping(mapping)) {
    throw new Error("Mapping tidak dikenali dari daftar akun — periksa format daftar akun");
  }

  return upsertClientProfile({
    clientId: input.clientId,
    firmId: input.firmId,
    coaMapping: mapping,
    mappingStatus: "REVIEW",
    sourcePeriod: input.sourcePeriod ?? null,
    updatedById: input.updatedById,
  });
}

/** Senior menyetujui mapping → READY (dipakai pipeline). */
export async function approveClientProfile(
  clientId: string,
  updatedById: string,
): Promise<ClientProfile> {
  const profile = await getClientProfile(clientId);
  if (!profile) throw new Error("Profil klien belum ada");
  if (profile.mappingStatus !== "REVIEW" && profile.mappingStatus !== "LEARNING") {
    throw new Error(`Hanya profile REVIEW/LEARNING yang bisa disetujui (status: ${profile.mappingStatus})`);
  }
  return prisma.clientProfile.update({
    where: { id: profile.id },
    data: { mappingStatus: "READY", updatedById },
  });
}

/** Hint COA klien untuk prompt drafting — baris "kode klien → akun standar". */
export function coaMappingHint(
  profile: Pick<ClientProfile, "mappingStatus" | "coaMapping"> | null,
): string | null {
  if (!profile || profile.mappingStatus !== "READY") return null;
  const mapping = profile.coaMapping as CoaMapping;
  const keys = Object.keys(mapping);
  if (keys.length === 0) return null;
  const lines = keys
    .slice(0, 200)
    .map((k) => `${k} → ${mapping[k].accountCode} ${mapping[k].accountName}${mapping[k].note ? ` (${mapping[k].note})` : ""}`);
  return `MAPPING COA KLIEN (kode klien → akun standar):\n${lines.join("\n")}`;
}

// ── T1.2 — Enrich master data klien (Lark-inspired) ──────────────────────

const INDUSTRY_ENUM = [
  "RETAIL", "SERVICES", "FNB", "MANUFACTURING", "CONSTRUCTION", "PROPERTY",
  "HOSPITALITY", "HEALTHCARE", "EDUCATION", "COOPERATIVE", "NONPROFIT",
  "AGRICULTURE", "TRANSPORT", "TECHNOLOGY", "FINANCE", "EVENT", "OTHER",
] as const;

export type ClientEnrichment = {
  taxId: string | null;
  industry: string | null;
  address: string | null;
  confidence: number;
};

/** Normalisasi NPWP: ambil 15 digit dari berbagai format (00.000.000.0-000.000). */
export function normalizeNpwp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 15) return null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(9, 12)}.${digits.slice(12, 15)}`;
}

const CLIENT_ENRICH_SYSTEM = `Kamu adalah ekstraktor data master akuntansi Indonesia. Dari teks dokumen klien
(akta, NPWP, faktur, surat), ekstrak data berikut:
- taxId: NPWP (15 digit; kosongkan jika tidak ditemukan)
- industry: industri utama, PILIH SATU dari: ${INDUSTRY_ENUM.join(", ")}
- address: alamat singkat (maks 120 karakter; kosongkan jika tidak ada)
Balas HANYA JSON: {"taxId":"...","industry":"...","address":"...","confidence":0.0-1.0}`;

/** Parse data master dari teks (LLM). Pure — tidak menyentuh DB. */
export async function parseClientEnrichment(text: string): Promise<ClientEnrichment> {
  const { json } = await chatJsonWithFallback({ system: CLIENT_ENRICH_SYSTEM, user: text.slice(0, 8000), timeoutMs: 90_000 });
  const o = (json ?? {}) as { taxId?: string; industry?: string; address?: string; confidence?: number };
  const npwp = normalizeNpwp(o.taxId);
  const industry = INDUSTRY_ENUM.includes((o.industry ?? "").toUpperCase() as (typeof INDUSTRY_ENUM)[number])
    ? (o.industry ?? "").toUpperCase()
    : null;
  return {
    taxId: npwp,
    industry,
    address: typeof o.address === "string" && o.address.trim() ? o.address.trim().slice(0, 120) : null,
    confidence: typeof o.confidence === "number" ? o.confidence : 0.7,
  };
}

/** Enrich master klien dari teks dokumen referensi (referenceText). */
export async function enrichClientMaster(input: {
  clientId: string;
  firmId: string;
  text?: string;
}): Promise<{ enrichment: ClientEnrichment; applied: { taxId?: string; industry?: string } }> {
  let text = input.text;
  if (!text) {
    const docs = await prisma.document.findMany({
      where: { clientId: input.clientId, referenceText: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { referenceText: true },
    });
    text = docs.map((d) => d.referenceText ?? "").join("\n\n");
  }
  if (!text || !text.trim()) {
    throw new Error("Tidak ada teks sumber. Upload dulu dokumen referensi (NPWP/akta) atau kirim teks.");
  }

  const enrichment = await parseClientEnrichment(text);
  const current = await prisma.client.findFirst({ where: { id: input.clientId, firmId: input.firmId }, select: { taxId: true, industry: true } });
  if (!current) throw new Error("Klien tidak ditemukan.");

  const applied: { taxId?: string; industry?: string } = {};
  const data: { taxId?: string; industry?: Industry } = {};
  if (!current.taxId && enrichment.taxId) {
    data.taxId = enrichment.taxId;
    applied.taxId = enrichment.taxId;
  }
  if (current.industry === "OTHER" && enrichment.industry && enrichment.industry !== "OTHER") {
    data.industry = enrichment.industry as Industry;
    applied.industry = enrichment.industry;
  }
  if (Object.keys(data).length > 0) {
    await prisma.client.update({ where: { id: input.clientId }, data });
  }

  return { enrichment, applied };
}
