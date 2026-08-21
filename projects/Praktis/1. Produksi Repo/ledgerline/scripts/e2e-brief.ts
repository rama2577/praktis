import { chromium } from "playwright";
const BASE = process.argv[2] ?? "http://localhost:3100";
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  await page.waitForSelector("text=Hari Ini", { timeout: 15000 });
  console.log("PASS: panel Hari Ini terlihat");
  await page.screenshot({ path: ".openclaw/tmp/mod-19-daily-brief.png", fullPage: false });
  console.log("screenshot: .openclaw/tmp/mod-19-daily-brief.png");
  await browser.close();
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
