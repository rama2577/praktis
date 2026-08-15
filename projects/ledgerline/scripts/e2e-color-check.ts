import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://web-production-7a593.up.railway.app/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  await page.waitForSelector("text=Hari Ini", { timeout: 20000 }).catch(()=>{});
  const out = await page.evaluate(`(() => {
    const g = (s) => { const n = document.querySelector(s); return n ? getComputedStyle(n).color : null; };
    const gb = (s) => { const n = document.querySelector(s); return n ? getComputedStyle(n).backgroundColor : null; };
    return JSON.stringify({
      slate600: g(".text-slate-600"),
      slate900: g(".text-slate-900"),
      muted: g(".text-muted"),
      accentBtn: gb(".bg-accent"),
      accentText: g(".text-accent"),
      positive: g(".text-emerald-600"),
      danger: g(".text-red-600")
    });
  })()`);
  console.log(out);
  await browser.close();
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
