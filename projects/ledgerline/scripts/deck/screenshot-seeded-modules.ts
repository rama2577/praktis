import { chromium } from "playwright";
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

  const shot = async (slug: string, wait = 1200) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(OUT, slug + ".png") });
    console.log("✓", slug);
  };
  const goto = async (route: string, wait = 1500) => {
    await page.goto(BASE + route, { waitUntil: "load", timeout: 45000 }).catch(async () => {
      await page.waitForTimeout(800);
    });
    await page.waitForTimeout(wait);
  };

  // Login
  await page.goto(BASE + "/login", { waitUntil: "load", timeout: 45000 });
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 25000 });
  await page.waitForTimeout(2000);

  const clients = await page.evaluate(async () => {
    const r = await fetch("/api/clients");
    const b = (await r.json()) as { data?: Array<{ id: string; name: string }> };
    return b.data ?? [];
  });
  const maju = clients.find((c) => c.name === "PT Maju Jaya") ?? clients[0];

  // 1) Laporan Custom AI — daftar template
  await goto("/dashboard/reports/custom", 2000);
  await shot("mod-53-laporan-custom");
  // pilih PT Maju Jaya agar konsisten
  try {
    await page.selectOption("select", { label: "PT Maju Jaya" });
    await page.waitForTimeout(1800);
  } catch {}
  await shot("mod-53-laporan-custom");
  // jalankan template pertama
  const runBtn = page.locator('button:has-text("Jalankan")').first();
  if (await runBtn.count()) {
    await runBtn.click();
    await page.waitForTimeout(1800);
    await shot("mod-64-laporan-custom-hasil");
  }

  // 2) Aset Tetap
  await goto("/dashboard/assets", 2000);
  try {
    await page.selectOption("select", { label: "PT Maju Jaya" });
    await page.waitForTimeout(1800);
  } catch {}
  await shot("mod-54-aset-tetap");
  const jadwalBtn = page.locator('button:has-text("Jadwal")').first();
  if (await jadwalBtn.count()) {
    await jadwalBtn.click();
    await page.waitForTimeout(1400);
    await shot("mod-65-aset-jadwal-penyusutan");
  }

  // 3) Profil klien (subledger + aging) + ledger subledger
  await goto(`/dashboard/clients/${maju.id}`, 2200);
  await shot("mod-61-profil-klien");
  const slBtn = page.locator('button:has-text("Buku Besar")').first();
  if (await slBtn.count()) {
    await slBtn.click();
    await page.waitForTimeout(1600);
    await shot("mod-66-subledger-ledger");
  }

  console.log("SELESAI");
  await browser.close();
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
