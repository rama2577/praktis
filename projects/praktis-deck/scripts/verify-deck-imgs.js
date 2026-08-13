/* Verifikasi gambar deck termuat (tidak broken) per slide yang diganti */
const path = require('path');
const { chromium } = require('/Users/staff/.openclaw-autoclaw/workspace/projects/ledgerline/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: "/Users/staff/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const deckPath = 'file://' + path.resolve(__dirname, '..', 'V4 Praktis Deck.html');
  await page.goto(deckPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const imgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map((img) => ({
      src: img.getAttribute('src'),
      ok: img.complete && img.naturalWidth > 0,
      w: img.naturalWidth,
      h: img.naturalHeight,
    }));
  });
  let bad = 0;
  for (const i of imgs) {
    const tag = i.src.includes('images-app') ? 'LIVE' : 'mockup';
    console.log(`${i.ok ? '✓' : '✗'} [${tag}] ${i.src} (${i.w}x${i.h})`);
    if (!i.ok) bad++;
  }
  console.log(bad === 0 ? '\n=== SEMUA GAMBAR OK ===' : `\n=== ${bad} GAMBAR BROKEN ===`);
  await browser.close();
  process.exit(bad === 0 ? 0 : 1);
})().catch((e) => { console.error(e.message); process.exit(1); });
