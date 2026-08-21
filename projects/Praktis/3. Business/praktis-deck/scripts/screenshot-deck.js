/* Screenshot deck slides — 1920x1080 via Chrome channel
 * Usage: node scripts/screenshot-deck.js ["Nama File.html"] [outputDir]
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('/Users/staff/.openclaw-autoclaw/workspace/projects/ledgerline/node_modules/playwright');

(async () => {
  const deckName = process.argv[2] || 'V1 Praktis Deck.html';
  const outDir = process.argv[3] || 'shots';
  const outPath = path.resolve(__dirname, '..', outDir);
  fs.mkdirSync(outPath, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const deckPath = 'file://' + path.resolve(__dirname, '..', deckName);
  await page.goto(deckPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const total = await page.evaluate(() => document.querySelectorAll('.slide').length);
  console.log('deck:', deckName, '| slides:', total);

  for (let i = 1; i <= total; i++) {
    await page.keyboard.press('Home');
    for (let k = 1; k < i; k++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(450);
    const p = path.join(outPath, `slide-${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: p });
    const title = await page.evaluate(() => {
      const s = document.querySelector('.slide.is-active');
      return s ? (s.dataset.title || '?') : '?';
    });
    console.log(`slide ${i}: ${title}`);
  }
  await browser.close();
  console.log('done');
})();
