/**
 * E2E — Gap #4 SPT 1771: tab → Lampiran I rekonsiliasi (klien ARYA),
 * kolom koreksi editable, Lampiran III PPh, tombol export.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PW_EXECUTABLE_PATH ?? "/Users/staff/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let failed = false;
  const check = (c: boolean, m: string) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failed = true; };

  try {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', "admin@ledgerline.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    await page.goto(`${BASE}/dashboard/reports/financial`);
    await page.waitForSelector("text=SPT 1771", { timeout: 15000 });
    await page.click("text=SPT 1771");
    await page.waitForTimeout(1000);

    // pilih klien ARYA
    await page.waitForSelector("select", { timeout: 15000 });
    const sel = await page.$("select");
    if (sel) {
      const opts = await sel.$$eval("option", (os) => os.map((o) => o.textContent ?? ""));
      const target = opts.find((o) => o.includes("ARYA USAHA TIRTA"));
      if (target) await sel.selectOption({ label: target });
    }
    await page.waitForTimeout(2500);
    let body = await page.textContent("body") ?? "";
    check(body.includes("Lampiran I — Rekonsiliasi Fiskal"), "Lampiran I rekonsiliasi tampil");
    check(body.includes("Laba Fiskal (Penghasilan Kena Pajak)"), "baris Laba Fiskal tampil");
    check(body.includes("Lampiran II — Penyusutan"), "Lampiran II tampil");
    check(body.includes("Lampiran III — Perhitungan PPh"), "Lampiran III tampil");
    check(body.includes("Export CSV Lampiran I"), "tombol export Lampiran I ada");

    // kolom koreksi editable
    const input = page.locator('input[type="number"]').first();
    check((await input.count()) > 0, "kolom koreksi editable tersedia");
    await input.fill("1000000");
    await page.waitForTimeout(400);
    body = await page.textContent("body") ?? "";
    check(body.includes("Laba Fiskal"), "setelah edit koreksi, tabel tetap tampil");

    console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  } catch (e) {
    console.log(`ERROR: ${(e as Error).message}`);
    await page.screenshot({ path: "/Users/staff/.openclaw-autoclaw/workspace/.openclaw/tmp/e2e-spt-error.png", fullPage: true }).catch(() => {});
    failed = true;
    console.log("RESULT: FAIL");
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
