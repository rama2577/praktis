const { chromium } = require("playwright");
const EXE = "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const BASE = "https://web-production-7a593.up.railway.app";
const OUT = "/Users/staff/.openclaw-autoclaw/workspace/projects/praktis-video/recordings";
const fs = require("fs");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE });

  // --- login to capture storageState ---
  const ctx0 = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const p0 = await ctx0.newPage();
  await p0.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 40000 });
  await p0.waitForSelector('input[name="email"]', { timeout: 20000 });
  await p0.fill('input[name="email"]', "admin@ledgerline.dev");
  await p0.fill('input[name="password"]', "password123");
  await p0.click('button[type="submit"]');
  await p0.waitForURL("**/dashboard", { timeout: 30000 });
  await p0.waitForTimeout(1500);
  const state = await ctx0.storageState();
  await ctx0.close();

  // --- recording context ---
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    storageState: state,
    recordVideo: { dir: OUT, size: { width: 1600, height: 900 } },
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(4000); // settle + show dashboard

  // STEP 1 — Dashboard (AI overview) ~12s
  await page.mouse.move(700, 320);
  await page.waitForTimeout(2500);
  await page.mouse.move(1150, 320);
  await page.waitForTimeout(2500);
  await page.waitForTimeout(6000);

  // STEP 2 — Pipeline Produksi (AI bekerja) ~15s
  await page.click('a[href="/dashboard/pipeline"]');
  await page.waitForTimeout(4000);
  await page.mouse.move(700, 300);
  await page.waitForTimeout(2500);
  await page.waitForTimeout(8000);

  // STEP 3 — Antrian Review → buka draft → Setujui ~14s
  await page.click('a[href="/dashboard/queues"]');
  await page.waitForTimeout(3000);
  await page.locator("button", { hasText: "Review" }).first().click();
  await page.waitForTimeout(4000); // show AI draft
  await page.locator("button", { hasText: "Setujui" }).first().click();
  await page.waitForTimeout(5000);

  // STEP 4 — Laporan Custom AI ~11s
  await page.goto(BASE + "/dashboard/reports/custom", { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(2500);
  await page.fill('input[placeholder*="pendapatan"]', "pendapatan per proyek");
  await page.waitForTimeout(1200);
  await page.locator("button", { hasText: "Usulkan Struktur" }).first().click();
  await page.waitForTimeout(7000);

  await ctx.close();
  await browser.close();
  console.log("RECORDING_DONE", OUT);
})().catch(e => { console.error("RECORD_FAIL:", e.message); process.exit(1); });
