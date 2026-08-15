const path = require('path');
const { chromium } = require('/Users/staff/.openclaw-autoclaw/workspace/projects/ledgerline/node_modules/playwright');
const EXEC = '/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXEC });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', 'V9 Praktis Deck — Ekspansi Segmen.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.pdf({ path: path.resolve(__dirname, '..', 'V9 Praktis Deck — Ekspansi Segmen.pdf'), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('PDF selesai → V9 Praktis Deck — Ekspansi Segmen.pdf');
})();
