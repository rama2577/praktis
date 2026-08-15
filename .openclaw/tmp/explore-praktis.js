const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const base = 'https://web-production-7a593.up.railway.app';

  await page.goto(base + '/login', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('=== LOGIN PAGE title ===', await page.title());
  const inputs = await page.$$eval('input, button', els => els.map(e => {
    const tag = e.tagName.toLowerCase();
    return `${tag}[name=${e.getAttribute('name')}][type=${e.getAttribute('type')}][placeholder=${e.getAttribute('placeholder')}][text=${(e.innerText||'').trim().slice(0,30)}]`;
  }));
  console.log('=== inputs/buttons ===');
  inputs.forEach(x => console.log(' ', x));

  // attempt login
  const emailSel = await page.$('input[type="email"]');
  const passSel = await page.$('input[type="password"]');
  if (emailSel && passSel) {
    await emailSel.fill('admin@ledgerline.dev');
    await passSel.fill('password123');
    const btn = await page.$('button[type="submit"]');
    if (btn) await btn.click();
    await page.waitForTimeout(4000);
    console.log('=== AFTER LOGIN URL ===', page.url());
    await page.screenshot({ path: '.openclaw/tmp/praktis-dashboard.png' });
    console.log('=== DASHBOARD H1/headings ===');
    const hs = await page.$$eval('h1,h2,h3,nav a', els => els.slice(0,40).map(e => (e.innerText||'').trim()).filter(Boolean));
    hs.forEach(h => console.log(' -', h.slice(0,60)));
  }
  await browser.close();
})();
