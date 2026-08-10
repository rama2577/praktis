import type { ClientProfile, ProfileStatus } from "@prisma/client";
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
