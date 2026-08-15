const path = require('path');
const { chromium } = require('/Users/staff/.openclaw-autoclaw/workspace/projects/ledgerline/node_modules/playwright');
const EXEC = '/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXEC });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('file://' + path.resolve(__dirname, '..', 'V8 Praktis Deck.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const idx = [0, 8, 9, 11, 13, 17];
  for (const i of idx) {
    await page.evaluate((n) => { const d = document.querySelector('[data-deck]'); const s = d.querySelectorAll('.slide'); s.forEach((x,j)=>x.classList.toggle('is-active', j===n)); }, i);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.resolve(__dirname, '..', 'images-modul', `00-deck-v8-s${i + 1}.png`) });
    console.log('slide', i + 1);
  }
  // manual book: halaman 2 (login+dashboard)
  const m = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await m.goto('file://' + path.resolve(__dirname, '..', 'Praktis Manual Book v3.html'), { waitUntil: 'networkidle' });
  await m.waitForTimeout(800);
  await m.screenshot({ path: path.resolve(__dirname, '..', 'images-modul', '00-manual-v3-p2.png') });
  console.log('manual p2');
  await browser.close();
})();
