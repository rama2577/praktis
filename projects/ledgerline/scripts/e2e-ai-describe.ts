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
  await page.goto(`${BASE}/dashboard/journals`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Jurnal Manual")');
  await page.waitForSelector("text=✨ AI", { timeout: 15000 });
  console.log("PASS: tombol ✨ AI terlihat");
  await page.screenshot({ path: ".openclaw/tmp/mod-17-ai-describe.png", fullPage: true });
  console.log("screenshot: .openclaw/tmp/mod-17-ai-describe.png");
  await browser.close();
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
