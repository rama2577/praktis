const { chromium } = require("playwright");
const EXE = "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const BASE = "https://web-production-7a593.up.railway.app";
const ROOT = "/Users/staff/.openclaw-autoclaw/workspace/projects/praktis-video";
const REC = ROOT + "/clips";
const fs = require("fs");
fs.mkdirSync(REC, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE });

  // login once
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

  async function recordClip(name, fn) {
    const dir = REC + "/" + name;
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      storageState: state,
      recordVideo: { dir, size: { width: 1600, height: 900 } },
    });
    const page = await ctx.newPage();
    try {
      await fn(page);
    } finally {
      await ctx.close();
    }
    console.log("CLIP_DONE", name);
  }

  // clip 1 — dashboard (~20s)
  await recordClip("dash", async (page) => {
    await page.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded", timeout: 40000 });
    await sleep(4000);
    await page.mouse.move(700, 330); await sleep(3000);
    await page.mouse.move(1180, 330); await sleep(3000);
    await sleep(10000);
  });

  // clip 2 — pipeline (~19s)
  await recordClip("pipeline", async (page) => {
    await page.goto(BASE + "/dashboard/pipeline", { waitUntil: "domcontentloaded", timeout: 40000 });
    await sleep(4000);
    await page.mouse.move(700, 300); await sleep(3000);
    await sleep(12000);
  });

  // clip 3 — review + approve (~12s)
  await recordClip("review", async (page) => {
    await page.goto(BASE + "/dashboard/queues", { waitUntil: "domcontentloaded", timeout: 40000 });
    await sleep(2800);
    await page.locator("button", { hasText: "Review" }).first().click();
    await sleep(4500); // show AI draft
    await page.locator("button", { hasText: "Setujui" }).first().click();
    await sleep(4000);
  });

  // clip 4 — custom AI (~11s)
  await recordClip("custom", async (page) => {
    await page.goto(BASE + "/dashboard/reports/custom", { waitUntil: "domcontentloaded", timeout: 40000 });
    await sleep(2500);
    await page.fill('input[placeholder*="pendapatan"]', "pendapatan per proyek");
    await sleep(1000);
    await page.locator("button", { hasText: "Usulkan Struktur" }).first().click();
    await sleep(6500);
  });

  await browser.close();
  console.log("ALL_CLIPS_DONE");
})().catch(e => { console.error("RECORD_FAIL:", e.message); process.exit(1); });
