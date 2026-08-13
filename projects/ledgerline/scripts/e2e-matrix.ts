/**
 * E2E — Gap #3 Matrix 12 Bulan.
 * Buka Laporan Keuangan → tab "Matrix 12 Bulan" → pilih klien ARYA → cek
 * tabel Laba Rugi 12 kolom (Jan..Des) + Total, Neraca kumulatif.
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
    await page.click("text=Matrix 12 Bulan");
    await page.waitForSelector("text=Menghitung matrix", { timeout: 15000 }).catch(() => {});

    // pilih klien ARYA
    await page.waitForSelector("select", { timeout: 15000 });
    const sel = await page.$("select");
    if (sel) {
      const opts = await sel.$$eval("option", (os) => os.map((o) => o.textContent ?? ""));
      const target = opts.find((o) => o.includes("ARYA USAHA TIRTA"));
      if (target) await sel.selectOption({ label: target });
    }
    await page.waitForTimeout(2500);
    const body = await page.textContent("body") ?? "";
    check(body.includes("Laba Rugi per Bulan"), "tabel Laba Rugi per Bulan tampil");
    check(body.includes("Neraca Posisi Akhir Bulan"), "tabel Neraca kumulatif tampil");
    const monthCells = MONTHS.every((m) => body.includes(m));
    check(monthCells, "header Jan..Des tampil");
    check(body.includes("Total") && body.includes("Rp"), "kolom Total + nilai Rp tampil");

    console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  } catch (e) {
    console.log(`ERROR: ${(e as Error).message}`);
    await page.screenshot({ path: "/Users/staff/.openclaw-autoclaw/workspace/.openclaw/tmp/e2e-matrix-error.png", fullPage: true }).catch(() => {});
    failed = true;
    console.log("RESULT: FAIL");
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
main();
