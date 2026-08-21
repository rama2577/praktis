/* Export Manual Book (A4) & Deck (1920×1080) → PDF */
const path = require('path');
const { chromium } = require('/Users/staff/.openclaw-autoclaw/workspace/projects/ledgerline/node_modules/playwright');

const EXEC = '/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function pdf(file, opts) {
  const browser = await chromium.launch({ headless: true, executablePath: EXEC });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', file), { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.pdf({ path: path.resolve(__dirname, '..', file.replace(/\.html$/i, '.pdf')), printBackground: true, ...opts });
  await browser.close();
  console.log('PDF selesai →', file.replace(/\.html$/i, '.pdf'));
}

(async () => {
  await pdf('V8 Praktis Deck.html', { width: '1920px', height: '1080px', preferCSSPageSize: true });
  await pdf('Praktis Manual Book v3.html', { format: 'A4', preferCSSPageSize: true });
})();
