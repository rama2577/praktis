import { chromium } from "@playwright/test";
const BASE = "http://localhost:3000";
async function main() {
  const browser = await chromium.launch({
    executablePath: "/Users/staff/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForSelector(".dv-dockview", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const links = await page.evaluate(() => {
    const dv = document.querySelector(".dv-dockview");
    return Array.from(dv?.querySelectorAll("a[href]") ?? []).map(a => a.getAttribute("href"));
  });
  const uniq = [...new Set(links)].sort();
  console.log("link panel:", JSON.stringify(uniq));
  // klik kartu KLIEN AKTIF -> harus navigasi ke /dashboard/clients
  const clientCard = page.locator(".dv-dockview a[href='/dashboard/clients']").first();
  await clientCard.click();
  await page.waitForURL("**/dashboard/clients", { timeout: 10000 });
  console.log("✓ klik KPI ->", page.url());
  await browser.close();
  const ok = uniq.length >= 5 && page.url().includes("/dashboard/clients");
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
