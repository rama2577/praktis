import { chromium } from "@playwright/test";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
async function main() {
  const browser = await chromium.launch({ executablePath: "/Users/staff/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.goto(`${BASE}/dashboard/reports/financial`);
  await page.waitForSelector("text=Matrix 12 Bulan", { timeout: 15000 });
  await page.getByRole("button", { name: "Laporan", exact: true }).click();
  await page.waitForTimeout(1200);
  const sel = await page.$("select");
  if (sel) {
    const opts = await sel.$$eval("option", (os) => os.map((o) => o.textContent ?? ""));
    const t = opts.find((o) => o.includes("ARYA USAHA TIRTA"));
    if (t) await sel.selectOption({ label: t });
  }
  await page.fill('input[type="month"]', "2026-01");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Perubahan Ekuitas", exact: true }).click();
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  const lines = text.split("\n").filter((l) => l.includes("EKUITAS") || l.includes("LABA") || l.includes("Rp"));
  console.log(lines.join("\n"));
  await browser.close();
}
main();
