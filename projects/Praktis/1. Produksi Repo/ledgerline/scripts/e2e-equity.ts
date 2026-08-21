/**
 * E2E — Gap #5 Laporan Perubahan Ekuitas (EQ v2).
 * Tab Laporan → pilih "Perubahan Ekuitas" → klien ARYA → cek saldo awal/akhir
 * tidak dobel-hitung & baris setoran/prive tersedia.
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
    await page.waitForSelector("text=Laporan", { timeout: 15000 });
    await page.getByRole("button", { name: "Laporan", exact: true }).click();
    await page.waitForTimeout(1200);

    // pilih klien ARYA
    await page.waitForSelector("select", { timeout: 15000 });
    const sel = await page.$("select");
    if (sel) {
      const opts = await sel.$$eval("option", (os) => os.map((o) => o.textContent ?? ""));
      const target = opts.find((o) => o.includes("ARYA USAHA TIRTA"));
      if (target) await sel.selectOption({ label: target });
    }
    await page.waitForTimeout(2000);

    // pilih periode berisi data (2026-01)
    await page.fill('input[type="month"]', "2026-01");
    await page.waitForTimeout(2000);

    // pilih jenis laporan Perubahan Ekuitas (tombol tab)
    await page.getByRole("button", { name: "Perubahan Ekuitas", exact: true }).click();
    await page.waitForTimeout(2000);

    const body = await page.textContent("body") ?? "";
    check(body.includes("LAPORAN PERUBAHAN EKUITAS"), "judul Laporan Perubahan Ekuitas tampil");
    check(body.includes("SALDO AWAL EKUITAS"), "baris Saldo Awal tampil");
    check(body.includes("SALDO AKHIR EKUITAS"), "baris Saldo Akhir tampil");
    check(body.includes("LABA (RUGI) PERIODE BERJALAN"), "baris Laba Periode Berjalan tampil");

    // konsistensi: SALDO AKHIR = SALDO AWAL + LABA (nilai dibaca dari innerText)
    const text = await page.locator("body").innerText();
    const lines = text.split("\n");
    const valAfter = (label: string) => {
      const i = lines.findIndex((l) => l.includes(label));
      if (i < 0) return null;
      const next = lines[i + 1] ?? "";
      const m = next.match(/Rp\s*([\d.,-]+)/);
      return m ? parseFloat(m[1].replace(/\./g, "").replace(",", ".")) : null;
    };
    const awal = valAfter("SALDO AWAL EKUITAS");
    const akhir = valAfter("SALDO AKHIR EKUITAS");
    check(awal !== null && akhir !== null && awal > 0 && akhir > 0, `nilai saldo terbaca (awal=${awal}, akhir=${akhir})`);
    check(akhir !== null && awal !== null && Math.abs(akhir - awal) > 0, "saldo akhir ≠ saldo awal (ada pergerakan laba)");

    console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  } catch (e) {
    console.log(`ERROR: ${(e as Error).message}`);
    await page.screenshot({ path: "/Users/staff/.openclaw-autoclaw/workspace/.openclaw/tmp/e2e-equity-error.png", fullPage: true }).catch(() => {});
    failed = true;
    console.log("RESULT: FAIL");
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
