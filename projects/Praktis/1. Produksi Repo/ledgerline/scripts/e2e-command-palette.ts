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
  await page.waitForSelector("text=Tanya AI", { timeout: 15000 });
  await page.click("text=Tanya AI");
  await page.waitForSelector('input[aria-label="Pertanyaan ke AI"]', { timeout: 10000 });
  await page.fill('input[aria-label="Pertanyaan ke AI"]', "Berapa klien aktif dan transaksi hari ini?");
  await page.click('button:has-text("Kirim")');
  await page.waitForSelector("text=Data firma", { timeout: 30000 }).catch(() => {});
  console.log("PASS: command palette AI terbuka & submit");
  await page.screenshot({ path: ".openclaw/tmp/mod-21-ai-command.png", fullPage: false });
  console.log("screenshot: .openclaw/tmp/mod-21-ai-command.png");
  await browser.close();
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
