/**
 * E2E — Gap #2 Template COA per industri.
 * 1. Login
 * 2. Buat klien baru dengan industri "Konstruksi & Developer"
 * 3. Buka klien → panel Mapping COA menampilkan akun khas konstruksi
 *    (Piutang Termin, Contract Liability, Retensi)
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

    // 2. Buat klien industri konstruksi
    const name = `PT Bangun Karya ${Date.now().toString().slice(-6)}`;
    await page.goto(`${BASE}/dashboard/clients`);
    await page.waitForSelector("text=+ Tambah Klien", { timeout: 15000 });
    await page.click("text=+ Tambah Klien");
    await page.waitForSelector("#client-name", { timeout: 10000 });
    await page.fill("#client-name", name);
    // dropdown industri: pilih konstruksi
    const sel = await page.$("#client-industry");
    const opts = sel ? await sel.$$eval("option", (os) => os.map((o) => o.textContent ?? "")) : [];
    check(opts.length > 10, `dropdown industri lengkap (${opts.length} opsi)`);
    check(opts.some((o) => o.includes("Konstruksi")), "opsi Konstruksi & Developer ada");
    if (sel) await sel.selectOption({ label: opts.find((o) => o.includes("Konstruksi"))! });
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=Klien berhasil", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 3. Buka klien baru → panel Mapping COA
    await page.goto(`${BASE}/dashboard/clients`);
    await page.waitForTimeout(1200);
    const link = page.locator("a", { hasText: name }).first();
    await link.click();
    await page.waitForURL("**/dashboard/clients/**", { timeout: 15000 });
    await page.waitForSelector("text=Lihat COA Klien", { timeout: 20000 });
    await page.click("text=Lihat COA Klien");
    await page.waitForTimeout(300);
    const body = await page.textContent("body") ?? "";
    check(body.includes("Piutang Termin"), "COA template: Piutang Termin tampil");
    check(body.includes("Contract Liability"), "COA template: Contract Liability tampil");
    check(body.includes("Retensi"), "COA template: Retensi tampil");

    // verifikasi via API
    const apiOk = await page.evaluate(async () => {
      const res = await fetch("/api/clients");
      const j = await res.json();
      const c = (j.data ?? []).find((x: { name: string }) => x.name.startsWith("PT Bangun Karya"));
      if (!c) return null;
      const p = (await (await fetch(`/api/clients/${c.id}/profile`)).json()).profile as { coaMapping?: Record<string, unknown> } | null;
      return p?.coaMapping ?? null;
    });
    check(!!apiOk && Object.keys(apiOk).length > 30, `coaMapping klien terisi via API (${apiOk ? Object.keys(apiOk).length : 0} akun)`);

    console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  } catch (e) {
    console.log(`ERROR: ${(e as Error).message}`);
    await page.screenshot({ path: "/Users/staff/.openclaw-autoclaw/workspace/.openclaw/tmp/e2e-coa-error.png", fullPage: true }).catch(() => {});
    failed = true;
    console.log("RESULT: FAIL");
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
