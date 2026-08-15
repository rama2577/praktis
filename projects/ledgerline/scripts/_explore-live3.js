const { chromium } = require("playwright");
const EXE = "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const BASE = "https://web-production-7a593.up.railway.app";
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 40000 });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.waitForTimeout(800);
  console.log("email value:", await page.inputValue('input[name="email"]'));
  console.log("pass len:", (await page.inputValue('input[name="password"]')).length);
  console.log("submit disabled?:", await page.locator('button[type="submit"]').isDisabled().catch(() => "?"));
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 }).catch(e => console.log("url wait fail:", e.message));
  await page.waitForTimeout(2500);
  console.log("after login URL:", page.url());

  // 1) queues -> open first review
  await page.goto(BASE + "/dashboard/queues", { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(2500);
  const reviewLoc = page.locator("button", { hasText: "Review" }).first();
  console.log("reviewBtn count:", await page.locator("button", { hasText: "Review" }).count());
  await reviewLoc.click({ timeout: 15000 }).catch(e => console.log("click review fail:", e.message));
  await page.waitForTimeout(3500);
  console.log("=== after Review click URL ===", page.url());
  const btns = await page.$$eval("button", els => els.map(e => (e.innerText || "").trim()).filter(Boolean).slice(0, 30));
  console.log("=== buttons on review page ===");
  btns.forEach(b => console.log(" -", b.replace(/\n/g, " ").slice(0, 50)));
  const heads = await page.$$eval("h1,h2,h3,strong", els => els.map(e => (e.innerText || "").trim()).filter(Boolean).slice(0, 25));
  console.log("=== headings ===");
  heads.forEach(h => console.log(" -", h.replace(/\n/g, " ").slice(0, 70)));
  await page.screenshot({ path: ".openclaw/tmp/live-review-open.png" });

  // 2) Laporan Custom AI
  await page.goto(BASE + "/dashboard/reports/custom", { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(2500);
  console.log("=== custom AI URL ===", page.url());
  const ch = await page.$$eval("h1,h2,h3,textarea,input,button", els => els.map(e => (e.tagName + ":" + (e.innerText || e.getAttribute('placeholder') || e.value || '')).trim()).filter(Boolean).slice(0, 30));
  console.log("=== custom AI elements ===");
  ch.forEach(c => console.log(" -", c.replace(/\n/g, " ").slice(0, 70)));
  await page.screenshot({ path: ".openclaw/tmp/live-custom-ai.png" });

  await browser.close();
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
