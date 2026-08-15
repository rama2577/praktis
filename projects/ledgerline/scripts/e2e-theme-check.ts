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
  const styles = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const card = document.querySelector(".card-hover") ? getComputedStyle(document.querySelector(".card-hover")) : null;
    const root = getComputedStyle(document.documentElement);
    return {
      bodyBg: body.backgroundColor,
      bodyColor: body.color,
      cardBg: card?.backgroundColor,
      cardBorder: card?.borderColor,
      accent: root.getPropertyValue("--accent").trim(),
      background: root.getPropertyValue("--background").trim(),
      foreground: root.getPropertyValue("--foreground").trim(),
    };
  });
  console.log(JSON.stringify(styles, null, 2));
  await browser.close();
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
