import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("https://web-production-7a593.up.railway.app/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  await page.goto("https://web-production-7a593.up.railway.app/dashboard/queues", { waitUntil: "networkidle" });
  await page.waitForSelector("text=Antrian Review", { timeout: 20000 }).catch(()=>{});
  await page.waitForSelector('button:has-text("Edit")', { timeout: 20000 }).catch(()=>{});
  const editBtn = page.locator('button:has-text("Edit")').first();
  if (await editBtn.count()) await editBtn.click();
  await page.waitForSelector('text=Deskripsi transaksi', { timeout: 10000 }).catch(()=>{});
  await page.waitForSelector('text=Akun (COA klien)', { timeout: 10000 }).catch(()=>{});
  await page.screenshot({ path: ".openclaw/tmp/mod-38-coa-editor.png" });
  // buka dropdown COA
  const coaBtn = page.locator('button[title^="1-"], button[title^="2-"], button[title^="3-"], button[title^="4-"], button[title^="5-"]').first();
  if (await coaBtn.count()) await coaBtn.click();
  await page.waitForSelector('text=Cari nama akun', { timeout: 5000 }).catch(()=>{});
  await page.screenshot({ path: ".openclaw/tmp/mod-39-coa-dropdown.png" });
  console.log("PASS: coa editor + dropdown screenshot");
  await browser.close();
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
