import { chromium, type Page } from "playwright";
import path from "node:path";

const BASE = "https://web-production-7a593.up.railway.app";
const OUT = path.join(process.cwd(), "..", "praktis-deck", "images-modul");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const shot = async (slug: string, wait = 1300) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(OUT, slug + ".png") });
    console.log("✓", slug);
  };
  const goto = async (route: string, wait = 1300) => {
    await page.goto(BASE + route, { waitUntil: "load", timeout: 45000 }).catch(async () => {
      // fallback: beberapa halaman pakai polling → paksa screenshot apa adanya
      await page.waitForTimeout(800);
    });
    await page.waitForTimeout(wait);
  };

  // Login
  await page.goto(BASE + "/login", { waitUntil: "load", timeout: 45000 });
  await shot("mod-40-login", 400);
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 25000 });
  await page.waitForTimeout(2500);

  // Ambil daftar klien + pilih PT Maju Jaya
  const clients = await page.evaluate(async () => {
    const r = await fetch("/api/clients");
    const b = (await r.json()) as { data?: Array<{ id: string; name: string }> };
    return b.data ?? [];
  });
  const maju = clients.find((c) => c.name === "PT Maju Jaya") ?? clients[0];
  const period = "2026-08";

  // ── Dashboard & fungsi utama ──
  await shot("mod-41-dashboard");

  // Command bar AI (⌘K / Tanya AI)
  await page.click('button:has-text("Tanya AI")').catch(() => {});
  await page.waitForSelector('input[aria-label="Pertanyaan ke AI"]', { timeout: 6000 }).catch(() => {});
  await shot("mod-42-command-ai", 500);
  await page.keyboard.press("Escape").catch(() => {});

  // ── Modul operasional ──
  await goto("/dashboard/pipeline");
  await shot("mod-43-pipeline");

  await goto("/dashboard/queues");
  await shot("mod-44-antrian-review");

  // Editor review + dropdown COA
  const editBtn = page.locator('button:has-text("Edit")').first();
  if (await editBtn.count()) await editBtn.click();
  await page.waitForSelector("text=Akun (COA klien)", { timeout: 6000 }).catch(() => {});
  await shot("mod-45-editor-koreksi", 600);
  const coaBtn = page.locator("td button[title^='1-'], td button[title^='2-'], td button[title^='3-'], td button[title^='4-'], td button[title^='5-']").first();
  if (await coaBtn.count()) await coaBtn.click();
  await page.waitForSelector("text=Cari nama akun", { timeout: 5000 }).catch(() => {});
  await shot("mod-46-dropdown-coa", 500);
  await page.keyboard.press("Escape").catch(() => {});

  await goto("/dashboard/journals");
  await shot("mod-47-jurnal-manual");

  await goto("/dashboard/exceptions");
  await shot("mod-48-pengecualian");

  // ── Laporan ──
  if (maju) {
    await goto(`/dashboard/reports/trial-balance?clientId=${maju.id}&period=${period}`);
    await shot("mod-49-neraca-percobaan");

    await goto(`/dashboard/reports/ledger?clientId=${maju.id}&period=${period}`);
    await shot("mod-50-buku-besar-semua");

    await goto(`/dashboard/reports/ledger?clientId=${maju.id}&period=${period}&accountCode=1-1000`);
    await shot("mod-51-buku-besar-akun");

    await goto(`/dashboard/reports/financial?clientId=${maju.id}&period=${period}`);
    await shot("mod-52-laporan-keuangan");
  }

  await goto("/dashboard/reports/custom");
  await shot("mod-53-laporan-custom");

  await goto("/dashboard/assets");
  await shot("mod-54-aset-tetap");

  await goto("/dashboard/tax");
  await shot("mod-55-core-tax");

  await goto("/dashboard/recon");
  await shot("mod-56-rekonsiliasi");

  // ── Pengawasan ──
  await goto("/dashboard/sla");
  await shot("mod-57-sla");

  await goto("/dashboard/quality");
  await shot("mod-58-kualitas");

  await goto("/dashboard/outbox");
  await shot("mod-59-outbox");

  // ── Pengelolaan ──
  await goto("/dashboard/clients");
  await shot("mod-60-klien");

  if (maju) {
    await goto(`/dashboard/clients/${maju.id}`);
    await shot("mod-61-profil-klien");
  }

  await goto("/dashboard/knowledge");
  await shot("mod-62-knowledge");

  await goto("/dashboard/settings");
  await shot("mod-63-pengaturan");

  console.log("SELESAI — semua screenshot tersimpan di", OUT);
  await browser.close();
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
