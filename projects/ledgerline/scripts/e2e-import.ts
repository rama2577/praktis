/**
 * E2E — Import Kertas Kerja Excel (ASC_2026.xlsx, ARYA USAHA TIRTA).
 * 1. Login admin
 * 2. Buka /dashboard/clients → klik "📥 Import Kertas Kerja"
 * 3. Upload ASC_2026.xlsx → preview (COA 193, jurnal 93 baris, peringatan)
 * 4. Nama klien terdeteksi otomatis → Import
 * 5. Verifikasi klien baru muncul di daftar
 * 6. Buka klien → trial balance tidak kosong (opening balance + jurnal)
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const XLSX = "/Users/staff/.openclaw-autoclaw/workspace/.openclaw-attachments/20260813-114101-43ed01f9-c4f-ASC_2026.xlsx";

async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.PW_EXECUTABLE_PATH ??
      "/Users/staff/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let failed = false;
  const say = (m: string) => console.log(m);
  const check = (cond: boolean, m: string) => {
    say(`${cond ? "✓" : "✗"} ${m}`);
    if (!cond) failed = true;
  };

  try {
    // 1. Login
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', "admin@ledgerline.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    say("✓ login admin");

    // 2. Halaman klien + buka wizard
    await page.goto(`${BASE}/dashboard/clients`);
    await page.waitForSelector("text=Import Kertas Kerja", { timeout: 15000 });
    await page.click("text=Import Kertas Kerja");
    await page.waitForSelector("text=Langkah 1 dari 3", { timeout: 10000 });
    say("✓ wizard terbuka");

    // 3. Upload file
    await page.setInputFiles('input[type="file"]', XLSX);
    await page.click("text=Tinjau →");
    await page.waitForSelector("text=Langkah 2 dari 3", { timeout: 30000 });
    const body2 = await page.textContent("body");
    check((body2 ?? "").includes("ARYA USAHA TIRTA"), "klien terdeteksi di preview");
    check((body2 ?? "").includes("Akun COA") && (body2 ?? "").includes("193"), "COA 193 akun");
    check((body2 ?? "").includes("Baris Jurnal"), "statistik jurnal tampil");
    say(`  (jurnal lines: ${(body2 ?? "").match(/Baris Jurnal\s*([\d.]+)/)?.[1] ?? "?"})`);
    check((body2 ?? "").includes("peringatan"), "peringatan validasi tampil");

    // 4. Import
    await page.click("text=Import 193 akun");
    await page.waitForSelector("text=Import selesai", { timeout: 60000 });
    const body3 = await page.textContent("body");
    check((body3 ?? "").includes("ARYA USAHA TIRTA"), "hasil import menampilkan nama klien");

    // 5. Buka klien → trial balance
    await page.click("text=Buka klien →");
    await page.waitForURL("**/dashboard/clients/**", { timeout: 15000 });
    await page.waitForSelector("text=ARYA USAHA TIRTA", { timeout: 15000 });
    say("✓ halaman klien terbuka");

    // Trial balance
    await page.goto(`${BASE}/dashboard/reports/trial-balance`);
    await page.waitForSelector('input[type="month"]', { timeout: 15000 });
    // pilih klien dari dropdown
    const selects = await page.$$("select");
    for (const sel of selects) {
      const opts = await sel.$$eval("option", (os) => os.map((o) => o.textContent ?? ""));
      if (opts.some((o) => o.includes("ARYA USAHA TIRTA"))) {
        await sel.selectOption({ label: opts.find((o) => o.includes("ARYA USAHA TIRTA"))! });
        break;
      }
    }
    // pilih periode yang memuat opening balance + jurnal Januari (CIMB muncul di sini)
    await page.fill('input[type="month"]', "2026-01");
    await page.waitForTimeout(2000);
    const tb = await page.textContent("body");
    check((tb ?? "").includes("CIMB") || (tb ?? "").includes("Petty Cash"), "trial balance menampilkan akun klien import");
    check((tb ?? "").includes("Seimbang") || (tb ?? "").includes("✓ Seimbang"), "trial balance seimbang (D = K)");

    say(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  } catch (e) {
    say(`ERROR: ${(e as Error).message}`);
    await page.screenshot({ path: "/Users/staff/.openclaw-autoclaw/workspace/.openclaw/tmp/e2e-import-error.png", fullPage: true }).catch(() => {});
    failed = true;
    say("RESULT: FAIL");
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
