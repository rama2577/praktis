/* Export dokumen HTML → PDF A4 portrait (manual book, laporan, dll) */
const path = require('path');
const { chromium } = require('/Users/staff/.openclaw-autoclaw/workspace/projects/ledgerline/node_modules/playwright');

(async () => {
  const doc = process.argv[2] || 'Praktis Manual Book v1.html';
  const pdf = doc.replace(/\.html$/i, '.pdf');
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', doc), { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.pdf({
    path: path.resolve(__dirname, '..', pdf),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await browser.close();
  console.log('PDF selesai →', pdf);
})();
