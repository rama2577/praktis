/* Export deck HTML → PDF (1920×1080 landscape, 1 slide per halaman) */
const path = require('path');
const { chromium } = require('/Users/staff/.openclaw-autoclaw/workspace/projects/ledgerline/node_modules/playwright');

(async () => {
  const deckName = process.argv[2] || 'V4 Praktis Deck.html';
  const pdfName = deckName.replace(/\.html$/i, '.pdf');
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  const url = 'file://' + path.resolve(__dirname, '..', deckName);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.pdf({
    path: path.resolve(__dirname, '..', pdfName),
    width: '1920px',
    height: '1080px',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await browser.close();
  console.log('PDF selesai →', pdfName);
})();
