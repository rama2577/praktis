const { chromium } = require("playwright");
const EXE = "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto("https://web-production-7a593.up.railway.app/login", { waitUntil: "networkidle", timeout: 30000 });
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 25000 });
  await page.waitForTimeout(1500);

  const targets = [
    ["/dashboard/pipeline", "pipeline"],
    ["/dashboard/queues", "queues"],
    ["/dashboard/reports/financial", "financial"],
    ["/dashboard/clients", "clients"],
  ];
  for (const [path, name] of targets) {
    await page.goto("https://web-production-7a593.up.railway.app" + path, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log("\n=====", name, "=====", page.url());
    const txt = await page.$$eval("h1,h2,h3,table tbody tr td:first-child, table tbody tr th:first-child, button", els =>
      els.map(e => (e.innerText || "").trim()).filter(Boolean).slice(0, 30));
    txt.slice(0, 25).forEach(t => console.log(" -", t.replace(/\n/g, " | ").slice(0, 70)));
    await page.screenshot({ path: `.openclaw/tmp/live-${name}.png` });
  }
  await browser.close();
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
