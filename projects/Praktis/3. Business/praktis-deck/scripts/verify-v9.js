const path = require('path');
const { chromium } = require('/Users/staff/.openclaw-autoclaw/workspace/projects/ledgerline/node_modules/playwright');
const EXEC = '/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXEC });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('file://' + path.resolve(__dirname, '..', 'V9 Praktis Deck — Ekspansi Segmen.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  for (const i of [0, 8, 10]) {
    await page.evaluate((n) => { const s = document.querySelectorAll('.slide'); s.forEach((x,j)=>x.classList.toggle('is-active', j===n)); }, i);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.resolve(__dirname, '..', 'images-modul', `00-v9-s${i+1}.png`) });
    console.log('slide', i+1);
  }
  await browser.close();
})();
