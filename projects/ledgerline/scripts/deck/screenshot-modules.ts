/**
 * Screenshot semua modul baru (gap #1–#6 + wizard import) untuk deck baru & manual book.
 * Output: projects/praktis-deck/images-modul/mod-*.png (retina 2x, 1440x900).
 *
 * Modul:
 *  mod-01 import wizard (upload) · mod-02 import wizard (preview)
 *  mod-03 subledger & aging · mod-04 buku besar pembantu
 *  mod-05 form klien + dropdown industri · mod-06 panel COA template
 *  mod-07 matrix 12 bulan · mod-08 SPT 1771 · mod-09 perubahan ekuitas
 *  mod-10 pembulatan ribuan · mod-11 ikhtisar bulanan
 *  mod-12 filter klien (queues) · mod-13 filter klien (outbox)
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "/Users/staff/.openclaw-autoclaw/workspace/projects/praktis-deck/images-modul";
const XLSX = "/Users/staff/.openclaw-autoclaw/workspace/.openclaw-attachments/20260813-114101-43ed01f9-c4f-ASC_2026.xlsx";

const shots: string[] = [];
let failed = false;
const ok = (m: string) => console.log(`✓ ${m}`);
const bad = (m: string) => { console.log(`✗ ${m}`); failed = true; };

async function shot(page: import("@playwright/test").Page, name: string) {
  await page.waitForTimeout(900); // biar animasi/loading selesai
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  shots.push(path);
  ok(`screenshot ${name}`);
}

/** Pilih klien ARYA pada <select> pertama yang terlihat. */
async function selectArya(page: import("@playwright/test").Page) {
  await page.waitForSelector("select", { timeout: 15000 });
  const sel = await page.$("select");
  if (!sel) return false;
  const opts = await sel.$$eval("option", (os) => os.map((o) => o.textContent ?? ""));
  const t = opts.find((o) => o.includes("ARYA USAHA TIRTA"));
  if (!t) return false;
  await sel.selectOption({ label: t });
  return true;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PW_EXECUTABLE_PATH ?? "/Users/staff/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  try {
    // ── Login ──
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', "admin@ledgerline.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    ok("login");

    // ── mod-05: form klien + dropdown industri ──
    await page.goto(`${BASE}/dashboard/clients`);
    await page.waitForSelector("text=Tambah Klien", { timeout: 15000 });
    await page.getByRole("button", { name: /Tambah Klien/ }).click();
    await page.waitForSelector("input", { timeout: 10000 });
    await page.fill('#client-name', "PT Bangun Karya");
    await page.selectOption("#client-industry", { label: "Konstruksi & Developer" }).catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, "mod-05-client-form-industri");
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);

    // ── mod-01 & mod-02: import wizard ──
    await page.goto(`${BASE}/dashboard/clients`);
    await page.waitForSelector("text=Import Kertas Kerja", { timeout: 15000 });
    await page.getByRole("button", { name: /Import Kertas Kerja/ }).click();
    await page.waitForSelector("text=Import Kertas Kerja Excel", { timeout: 10000 });
    await page.waitForTimeout(600);
    await shot(page, "mod-01-import-wizard-upload");
    await page.setInputFiles('input[type="file"]', XLSX);
    await page.waitForSelector("text=COA terdeteksi", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000); // parsing excel
    await shot(page, "mod-02-import-wizard-preview");
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);

    // ── mod-06: panel COA template klien ARYA ──
    await page.goto(`${BASE}/dashboard/clients`);
    await page.waitForSelector("text=ARYA USAHA TIRTA", { timeout: 15000 });
    await page.getByText("ARYA USAHA TIRTA, CV").first().click();
    await page.waitForURL("**/dashboard/clients/**", { timeout: 15000 });
    await page.waitForSelector("text=Lihat COA Klien", { timeout: 15000 });
    await page.getByText(/Lihat COA Klien/).first().click();
    await page.waitForTimeout(600);
    await shot(page, "mod-06-client-coa-template");

    // ── mod-03 & mod-04: subledger & aging ──
    await page.goto(`${BASE}/dashboard/clients`);
    await page.waitForSelector("text=ARYA USAHA TIRTA", { timeout: 15000 });
    await page.getByText("ARYA USAHA TIRTA, CV").first().click();
    await page.waitForURL("**/dashboard/clients/**", { timeout: 15000 });
    await page.waitForSelector("text=Aging Piutang", { timeout: 20000 });
    await page.getByText("Aging Piutang").first().scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, "mod-03-subledger-aging");
    // buka buku besar pembantu: klik baris subledger CT-001
    const row = page.locator("tr", { hasText: "CT-001" }).first();
    if ((await row.count()) > 0) {
      await row.click();
      await page.waitForSelector("text=Buku Besar Pembantu", { timeout: 10000 });
      await page.waitForTimeout(800);
      await shot(page, "mod-04-subledger-ledger");
    } else {
      bad("baris CT-001 tidak ditemukan untuk ledger");
    }

    // ── mod-11: ikhtisar bulanan ──
    await page.goto(`${BASE}/dashboard/reports/financial`);
    await page.waitForSelector("text=Ikhtisar", { timeout: 15000 });
    await selectArya(page);
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Bulanan", exact: true }).click().catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, "mod-11-ikhtisar-bulanan");

    // ── mod-07: matrix 12 bulan ──
    await page.getByRole("button", { name: "Matrix 12 Bulan", exact: true }).click();
    await page.waitForTimeout(1500);
    await selectArya(page);
    await page.waitForTimeout(2500);
    await shot(page, "mod-07-matrix-12-bulan");

    // ── mod-08: SPT 1771 ──
    await page.getByRole("button", { name: "SPT 1771", exact: true }).click();
    await page.waitForTimeout(1200);
    await selectArya(page);
    await page.waitForTimeout(2500);
    await shot(page, "mod-08-spt-1771");

    // ── mod-09 & mod-10: laporan (ekuitas + rounding) ──
    await page.getByRole("button", { name: "Laporan", exact: true }).click();
    await page.waitForTimeout(1000);
    await selectArya(page);
    await page.fill('input[type="month"]', "2026-01");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Perubahan Ekuitas", exact: true }).click();
    await page.waitForTimeout(2000);
    await shot(page, "mod-09-ekuitas");
    await page.getByRole("button", { name: "Laba Rugi", exact: true }).click();
    await page.waitForTimeout(1200);
    await page.selectOption("select >> nth=1", "ribu").catch(async () => {
      const sel = page.locator("select").nth(1);
      await sel.selectOption({ label: "Ribuan (Rp'000)" }).catch(() => {});
    });
    await page.waitForTimeout(1200);
    await shot(page, "mod-10-rounding-ribuan");

    // ── mod-12: filter klien queues ──
    await page.goto(`${BASE}/dashboard/queues`);
    await page.waitForSelector("select", { timeout: 15000 });
    const qsel = await page.$("select");
    if (qsel) {
      const opts = await qsel.$$eval("option", (os) => os.map((o) => o.textContent ?? ""));
      const t = opts.find((o) => o.includes("ARYA USAHA TIRTA"));
      if (t) await qsel.selectOption({ label: t });
    }
    await page.waitForTimeout(1000);
    await shot(page, "mod-12-queues-filter");

    // ── mod-13: filter klien outbox ──
    await page.goto(`${BASE}/dashboard/outbox`);
    await page.waitForSelector("select", { timeout: 15000 });
    const osel = await page.$("select");
    if (osel) {
      const opts = await osel.$$eval("option", (os) => os.map((o) => o.textContent ?? ""));
      const t = opts.find((o) => o.includes("ARYA USAHA TIRTA"));
      if (t) await osel.selectOption({ label: t });
    }
    await page.waitForTimeout(1000);
    await shot(page, "mod-13-outbox-filter");

    console.log(`\n${shots.length} screenshot tersimpan di ${OUT}`);
    console.log(failed ? "RESULT: FAIL" : "RESULT: PASS");
  } catch (e) {
    console.log(`ERROR: ${(e as Error).message}`);
    await page.screenshot({ path: `${OUT}/mod-00-error.png`, fullPage: false }).catch(() => {});
    failed = true;
    console.log("RESULT: FAIL");
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
