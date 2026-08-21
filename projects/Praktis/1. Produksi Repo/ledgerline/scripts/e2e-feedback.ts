/**
 * E2E — Masukan Rama (2026-08-13):
 * A. Ikhtisar: toggle Tahunan/Bulanan (12 kolom bulan di tahun sama).
 * B. Antrian Review: dropdown sortir klien.
 * C. Exceptions: dropdown sortir klien.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.PW_EXECUTABLE_PATH ??
      "/Users/staff/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let failed = false;
  const check = (c: boolean, m: string) => {
    console.log(`${c ? "✓" : "✗"} ${m}`);
    if (!c) failed = true;
  };

  try {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', "admin@ledgerline.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("✓ login");

    // ── A. Ikhtisar: toggle bulanan ──
    await page.goto(`${BASE}/dashboard/reports/financial`);
    await page.waitForSelector("text=Ikhtisar", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    // klik tab Ikhtisar bila ada
    const tabs = await page.$$("button");
    for (const t of tabs) {
      const txt = (await t.textContent()) ?? "";
      if (txt.includes("Ikhtisar")) { await t.click(); break; }
    }
    await page.waitForTimeout(1200);
    await page.click("text=Bulanan").catch(() => {});
    await page.waitForTimeout(1500);
    const bodyA = await page.textContent("body") ?? "";
    check(bodyA.includes("🗓️ Bulanan") || bodyA.includes("Bulanan"), "toggle Bulanan tersedia");
    check(bodyA.includes("Jan") && bodyA.includes("Des"), "header bulan Jan..Des tampil di mode bulanan");
    await page.click("text=Tahunan").catch(() => {});
    await page.waitForTimeout(1200);
    const bodyA2 = await page.textContent("body") ?? "";
    check(/202[0-6]-/.test(bodyA2), "mode tahunan menampilkan kolom tahun (YYYY-MM)");

    // ── B. Antrian Review: dropdown sortir klien ──
    await page.goto(`${BASE}/dashboard/queues`);
    await page.waitForSelector("text=Sortir klien", { timeout: 15000 });
    const qSel = await page.$('select');
    check(qSel !== null, "dropdown sortir klien di Antrian Review");
    const qOpts = qSel ? await qSel.$$eval("option", (os) => os.map((o) => o.textContent ?? "")) : [];
    check(qOpts.length > 1 && qOpts[0]!.startsWith("Semua klien"), `opsi dropdown: ${qOpts.length} (${qOpts[0]})`);

    // ── C. Exceptions: dropdown sortir klien ──
    await page.goto(`${BASE}/dashboard/exceptions`);
    await page.waitForSelector("text=Sortir klien", { timeout: 15000 });
    const eSel = await page.$('select');
    check(eSel !== null, "dropdown sortir klien di Manajemen Exception");

    // ── D. Outbox: filter klien ──
    await page.goto(`${BASE}/dashboard/outbox`);
    await page.waitForSelector("text=Sortir klien", { timeout: 15000 });
    const oSel = await page.$('select');
    check(oSel !== null, "dropdown sortir klien di Outbox");

    console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  } catch (e) {
    console.log(`ERROR: ${(e as Error).message}`);
    await page.screenshot({ path: "/Users/staff/.openclaw-autoclaw/workspace/.openclaw/tmp/e2e-feedback-error.png", fullPage: true }).catch(() => {});
    failed = true;
    console.log("RESULT: FAIL");
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
