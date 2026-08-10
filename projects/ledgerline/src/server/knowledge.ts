import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { KnowledgeItem, KnowledgeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Direktori knowledge base (sumber awal — akan di-seed ke DB, EN-01). */
export const KNOWLEDGE_DIR = path.join(process.cwd(), "src", "ai", "knowledge");

export type KnowledgeEntry = {
  name: string;
  ext: string;
  category: string;
  sizeBytes: number;
  preview: string;
};

/** Kategorikan nama file → grup knowledge (pure, unit-testable). */
export function knowledgeCategory(name: string): string {
  if (name.startsWith("coa-")) return "Chart of Accounts (COA)";
  if (name.startsWith("tax-")) return "Peraturan Pajak";
  if (name.includes("business-events")) return "Business Events";
  if (name.includes("journal-templates")) return "Template Jurnal";
  if (name.includes("validation")) return "Validasi & Materialitas";
  if (name.includes("psak")) return "Referensi PSAK";
  if (name.includes("closing")) return "Prosedur Closing";
  if (name.includes("materiality")) return "Validasi & Materialitas";
  if (name.includes("industry")) return "Referensi Industri";
  if (name.includes("accounting-skills")) return "Keterampilan Akuntansi";
  return "Lainnya";
}

const PREVIEW_LIMIT = 800;

/** Baca seluruh file knowledge (sumber legacy statis). */
export async function listKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const names = (await readdir(KNOWLEDGE_DIR)).filter((n) => n.startsWith(".") === false).sort();
  const entries: KnowledgeEntry[] = [];
  for (const name of names) {
    const filePath = path.join(KNOWLEDGE_DIR, name);
    const meta = await stat(filePath);
    if (!meta.isFile()) continue;
    const ext = path.extname(name).slice(1).toUpperCase();
    const content = await readFile(filePath, "utf8");
    entries.push({
      name,
      ext,
      category: knowledgeCategory(name),
      sizeBytes: meta.size,
      preview: content.slice(0, PREVIEW_LIMIT),
    });
  }
  return entries;
}

// ══════════ EN-01 — KnowledgeItem (DB, versioned, approval) ══════════

/** Konten aktif untuk satu nama KB (status ACTIVE + effectiveDate ≤ now, versi tertinggi). */
export async function getActiveKnowledge(name: string): Promise<KnowledgeItem | null> {
  return prisma.knowledgeItem.findFirst({
    where: {
      name,
      status: "ACTIVE",
      effectiveDate: { lte: new Date() },
    },
    orderBy: [{ version: "desc" }],
  });
}

/** Konten aktif semua KB (untuk drafting/engine), dipilih per nama. */
export async function getAllActiveKnowledge(): Promise<KnowledgeItem[]> {
  const items = await prisma.knowledgeItem.findMany({
    where: { status: "ACTIVE", effectiveDate: { lte: new Date() } },
    orderBy: [{ name: "asc" }, { version: "desc" }],
  });
  // Satu per nama (versi tertinggi)
  const byName = new Map<string, KnowledgeItem>();
  for (const item of items) {
    if (!byName.has(item.name)) byName.set(item.name, item);
  }
  return [...byName.values()];
}

/** List semua versi (untuk UI admin KB). */
export async function listKnowledgeItems(opts?: {
  category?: string;
  status?: KnowledgeStatus;
}): Promise<KnowledgeItem[]> {
  return prisma.knowledgeItem.findMany({
    where: {
      ...(opts?.category ? { category: opts.category } : {}),
      ...(opts?.status ? { status: opts.status } : {}),
    },
    orderBy: [{ name: "asc" }, { version: "desc" }],
    take: 500,
  });
}

/**
 * Buat draf versi baru. Version = versi tertinggi existing + 1 (atau 1).
 * `supersedes` menunjuk ke item ACTIVE lama dengan nama yang sama.
 */
export async function createKnowledgeDraft(input: {
  category: string;
  name: string;
  title: string;
  content: string;
  effectiveDate: Date;
  changeNote?: string;
  createdById?: string;
}): Promise<KnowledgeItem> {
  const latest = await prisma.knowledgeItem.findFirst({
    where: { name: input.name },
    orderBy: { version: "desc" },
  });
  const active = await getActiveKnowledge(input.name);
  return prisma.knowledgeItem.create({
    data: {
      category: input.category,
      name: input.name,
      title: input.title,
      content: input.content,
      effectiveDate: input.effectiveDate,
      changeNote: input.changeNote,
      createdById: input.createdById,
      version: (latest?.version ?? 0) + 1,
      status: "DRAFT",
      supersedesId: active?.id,
    },
  });
}

/** Setujui draf → ACTIVE; item aktif lama dengan nama sama → SUPERSEDED. */
export async function approveKnowledge(id: string, approvedById: string): Promise<KnowledgeItem> {
  const item = await prisma.knowledgeItem.findUnique({ where: { id } });
  if (!item) throw new Error("Knowledge item tidak ditemukan");
  if (item.status !== "DRAFT") throw new Error(`Hanya DRAFT yang bisa disetujui (status: ${item.status})`);

  await prisma.$transaction([
    prisma.knowledgeItem.updateMany({
      where: { name: item.name, status: "ACTIVE", id: { not: item.id } },
      data: { status: "SUPERSEDED" },
    }),
    prisma.knowledgeItem.update({
      where: { id },
      data: { status: "ACTIVE", approvedById, approvedAt: new Date() },
    }),
  ]);
  return prisma.knowledgeItem.findUniqueOrThrow({ where: { id } });
}

/** Tolak draf → REJECTED (riwayat tetap, audit trail). */
export async function rejectKnowledge(id: string): Promise<KnowledgeItem> {
  const item = await prisma.knowledgeItem.findUnique({ where: { id } });
  if (!item) throw new Error("Knowledge item tidak ditemukan");
  if (item.status !== "DRAFT") throw new Error(`Hanya DRAFT yang bisa ditolak (status: ${item.status})`);
  return prisma.knowledgeItem.update({ where: { id }, data: { status: "REJECTED" } });
}

/** Seed idempotent: impor 13 file knowledge → KnowledgeItem ACTIVE v1. */
export async function seedKnowledgeFromFiles(): Promise<number> {
  const entries = await listKnowledgeEntries();
  let created = 0;
  for (const entry of entries) {
    // Nama konsisten tanpa ekstensi (sama dengan API/knowledgeCategory)
    const name = entry.name.replace(/\.[^.]+$/, "");
    const existing = await prisma.knowledgeItem.findFirst({
      where: { name, version: 1 },
    });
    if (existing) continue;
    const content = await readFile(path.join(KNOWLEDGE_DIR, entry.name), "utf8");
    await prisma.knowledgeItem.create({
      data: {
        category: entry.category,
        name,
        title: name,
        content,
        version: 1,
        effectiveDate: new Date(),
        status: "ACTIVE",
        approvedAt: new Date(),
      },
    });
    created += 1;
  }
  return created;
}
