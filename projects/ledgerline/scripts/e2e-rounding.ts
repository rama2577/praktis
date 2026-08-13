/**
 * E2E — Gap #6 Rounding Engine.
 * Tab Laporan → pilih "Ribuan" → cek nilai tampil dalam ribuan &
 * konsistensi LABA = TOTAL PENDAPATAN − TOTAL BEBAN pada tampilan.
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
    await page.waitForSelector("text=Matrix 12 Bulan", { timeout: 15000 });
    await page.getByRole("button", { name: "Laporan", exact: true }).click();
    await page.waitForTimeout(1200);

    // klien ARYA + periode 2026-01 (data ada)
    const sel = await page.$("select");
    if (sel) {
      const opts = await sel.$$eval("option", (os) => os.map((o) => o.textContent ?? ""));
      const t = opts.find((o) => o.includes("ARYA USAHA TIRTA"));
      if (t) await sel.selectOption({ label: t });
    }
    await page.fill('input[type="month"]', "2026-01");
    await page.waitForTimeout(1500);

    // dropdown pembulatan → Ribuan
    await page.selectOption("select >> nth=1", "ribu");
    await page.waitForTimeout(800);

    const text = await page.locator("body").innerText();
    check(text.includes("Pembulatan"), "dropdown Pembulatan ada");
    check(text.includes("Ribuan (Rp'000)"), "opsi Ribuan ada");

    // konsistensi LR: LABA = PENDAPATAN − BEBAN (nilai rounded, tanpa Rp besar)
    const lines = text.split("\n");
    const valAfter = (label: string) => {
      const i = lines.findIndex((l) => l.includes(label));
      if (i < 0) return null;
      const next = lines[i + 1] ?? "";
      const m = next.match(/Rp\s*([\d.,-]+)/);
      return m ? parseFloat(m[1].replace(/\./g, "").replace(",", ".")) : null;
    };
    const pend = valAfter("TOTAL PENDAPATAN");
    const beban = valAfter("TOTAL BEBAN");
    const laba = valAfter("LABA (RUGI) PERIODE BERJALAN");
    check(pend !== null && beban !== null && laba !== null, `nilai rounded terbaca (P=${pend}, B=${beban}, L=${laba})`);
    check(pend !== null && beban !== null && laba !== null && Math.abs(pend - beban - laba) < 0.01, "LABA = TOTAL PENDAPATAN − TOTAL BEBAN konsisten");

    // cek nilai dalam skala ribuan (pendapatan ARYA 2026-01 puluhan juta → tampil ribuan 20-50, bukan 20.000.000)
    check(pend !== null && pend < 1_000_000, `nilai tampil dalam ribuan (${pend} < 1jt)`);

    console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  } catch (e) {
    console.log(`ERROR: ${(e as Error).message}`);
    await page.screenshot({ path: "/Users/staff/.openclaw-autoclaw/workspace/.openclaw/tmp/e2e-rounding-error.png", fullPage: true }).catch(() => {});
    failed = true;
    console.log("RESULT: FAIL");
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
