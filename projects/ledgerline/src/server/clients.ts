import type { Industry } from "@prisma/client";
import { prisma } from "@/lib/db";
import { INDUSTRY_LIST, isIndustry } from "@/lib/industries";

// ── Validasi input klien (tanpa dependency eksternal) ────────────────────

export type ClientInput = {
  name: string;
  industry: string;
  taxId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

export type ClientErrors = Partial<Record<"name" | "industry" | "taxId", string>>;

const INDUSTRIES: Industry[] = INDUSTRY_LIST;

/** Validasi & normalisasi input klien. Return { ok: true, data } atau { ok: false, errors }. */
export function validateClientInput(raw: unknown): { ok: true; data: ClientInput } | { ok: false; errors: ClientErrors } {
  const errors: ClientErrors = {};
  const input = (raw ?? {}) as Record<string, unknown>;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) errors.name = "Nama klien wajib diisi.";
  else if (name.length > 120) errors.name = "Nama maksimal 120 karakter.";

  const industry = typeof input.industry === "string" ? input.industry : "";
  if (!isIndustry(industry)) {
    errors.industry = "Pilih industri yang valid.";
  }

  let taxId: string | null = null;
  if (input.taxId != null && String(input.taxId).trim() !== "") {
    taxId = String(input.taxId).trim();
    if (taxId.length > 30 || !/^[0-9.\-]*$/.test(taxId)) {
      errors.taxId = "NPWP hanya boleh angka, titik, dan strip (maks 30 karakter).";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, industry: industry as Industry, taxId } };
}

// ── Query helpers ────────────────────────────────────────────────────────

/** Daftar klien + jumlah dokumen & jurnal (untuk halaman/list). */
export async function listClients(firmId: string) {
  return prisma.client.findMany({
    where: { firmId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { documents: true, journals: true } },
    },
  });
}

/**
 * Klien aktif saja — dipakai untuk membuat antrian/dokumen baru.
 * Jaminan acceptance: "klien nonaktif tidak muncul di queue baru".
 */
export async function listActiveClients(firmId: string) {
  return prisma.client.findMany({
    where: { firmId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

export type ClientListItem = Awaited<ReturnType<typeof listClients>>[number];
