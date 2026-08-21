/**
 * KB Seed — Prinsip akuntansi/pajak/PSAK dari skill keuangan-akuntansi-indonesia.
 * Membaca references/01–08 → KnowledgeItem ACTIVE (1 item per file, ringkasan heading).
 * Idempotent: skip jika name sudah ada.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const ASSETS_DIR = join(process.cwd(), "src", "ai", "knowledge");

const prisma = new PrismaClient();

const REFS_DIR = "/Users/staff/.openclaw-autoclaw/skills/keuangan-akuntansi-indonesia/references";

const FILES: { file: string; name: string; category: string; tags: string[] }[] = [
  { file: "01-prinsip-siklus-akuntansi.md", name: "prinsip-siklus-akuntansi", category: "Keterampilan Akuntansi", tags: ["siklus akuntansi", "jurnal", "buku besar", "trial balance"] },
  { file: "02-akuntansi-biaya.md", name: "akuntansi-biaya", category: "Keterampilan Akuntansi", tags: ["biaya", "hpp", "cost accounting"] },
  { file: "03-manajemen-keuangan.md", name: "manajemen-keuangan", category: "Keterampilan Akuntansi", tags: ["arus kas", "modal kerja", "rasio"] },
  { file: "04-pajak-indonesia.md", name: "pajak-indonesia", category: "Peraturan Pajak", tags: ["ppn", "pph", "spt", "npwp", "core tax"] },
  { file: "05-sak-psak-indonesia.md", name: "sak-psak-indonesia", category: "Referensi PSAK", tags: ["psak", "sak", "laporan keuangan"] },
  { file: "06-laporan-dashboard.md", name: "laporan-dashboard", category: "Referensi Laporan", tags: ["dashboard", "kpi", "laporan manajemen"] },
  { file: "07-format-laporan-keuangan.md", name: "format-laporan-keuangan", category: "Referensi Laporan", tags: ["neraca", "laba rugi", "format"] },
  { file: "08-adaptasi-annual-report-unilever.md", name: "adaptasi-annual-report-unilever", category: "Referensi Industri", tags: ["annual report", "unilever", "benchmark"] },
];

function summarize(file: string, maxChars = 5000): string {
  const md = readFileSync(join(REFS_DIR, file), "utf8");
  const lines = md.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("```") || t.startsWith("|") || t.startsWith("<!--")) continue;
    if (t.startsWith("#")) {
      out.push(`\n## ${t.replace(/^#+\s*/, "")}`);
    } else if (t.startsWith("- ") || /^\d+\.\s/.test(t)) {
      out.push(`- ${t.replace(/^[-*\d.]+[\s)]*/, "")}`);
    } else if (t.length > 3 && !t.startsWith("![")) {
      out.push(t);
    }
    if (out.join("\n").length > maxChars) break;
  }
  return out.join("\n").slice(0, maxChars);
}

async function main() {
  let created = 0;
  for (const f of FILES) {
    const content = summarize(f.file);

    // File assets (tampil di "Isi Referensi" & dipakai rule engine) — idempotent per file.
    const assetFile = join(ASSETS_DIR, `${f.name}.md`);
    if (!existsSync(assetFile)) {
      writeFileSync(assetFile, `# ${f.name.replace(/-/g, " ")}\n\n> Sumber: skill keuangan-akuntansi-indonesia (${f.file}). Kategori: ${f.category}.\n\n${content}\n`);
      console.log(`asset+ ${assetFile.split("/").pop()}`);
    } else {
      console.log(`asset= ${f.name}.md (sudah ada)`);
    }

    const existing = await prisma.knowledgeItem.findFirst({
      where: { name: f.name, category: f.category },
    });
    if (existing) {
      console.log(`skip  ${f.name} (sudah ada di DB)`);
      continue;
    }
    await prisma.knowledgeItem.create({
      data: {
        category: f.category,
        name: f.name,
        title: `Praktis — ${f.file.replace(/^\d+-/, "").replace(/\.md$/, "").replace(/-/g, " ")}`,
        content,
        status: "ACTIVE",
        effectiveDate: new Date("2026-01-01"),
        changeNote: `Seed dari skill keuangan-akuntansi-indonesia (ringkasan references). Tags: ${f.tags.join(", ")}.`,
      },
    });
    created += 1;
    console.log(`db+   ${f.name} (${content.length} char)`);
  }
  console.log(`KB Seed selesai: ${created} baru.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
