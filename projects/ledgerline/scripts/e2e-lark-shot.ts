import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("https://web-production-7a593.up.railway.app/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: ".openclaw/tmp/mod-27-lark-login.png" });
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  await page.waitForSelector("text=Hari Ini", { timeout: 20000 }).catch(()=>{});
  await page.screenshot({ path: ".openclaw/tmp/mod-28-lark-dashboard.png" });
  await page.goto("https://web-production-7a593.up.railway.app/dashboard/clients", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ".openclaw/tmp/mod-29-lark-clients.png" });
  console.log("PASS: 3 screenshot lark");
  await browser.close();
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
