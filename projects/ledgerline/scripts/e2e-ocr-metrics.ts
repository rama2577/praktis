/**
 * E2E: verifikasi panel "Metrik OCR Hybrid" di halaman Metrik Kualitas.
 * Login admin demo → /dashboard/quality → assert panel ada → screenshot.
 * Usage: npx tsx scripts/e2e-ocr-metrics.ts [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
  await page.goto(`${BASE}/dashboard/quality`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Metrik OCR Hybrid", { timeout: 15_000 });
  const title = await page.title();
  console.log("PASS: panel Metrik OCR Hybrid terlihat ·", title);
  await page.screenshot({ path: ".openclaw/tmp/mod-16-ocr-metrics.png", fullPage: true });
  console.log("screenshot: .openclaw/tmp/mod-16-ocr-metrics.png");
  await browser.close();
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
