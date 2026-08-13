/**
 * E2E — F7: persistensi layout Dockview.
 * 1. Login admin
 * 2. Buka /dashboard, tunggu workspace dockview
 * 3. Tutup panel "Monitoring SLA" (klik tombol close tab)
 * 4. Verifikasi /api/dashboard/layout mengembalikan JSON (layout tersimpan)
 * 5. Reload halaman → panel SLA tetap tertutup (layout ter-load dari server)
 * 6. Reset Layout → panel kembali
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
  const log: string[] = [];
  const say = (m: string) => {
    log.push(m);
    console.log(m);
  };

  // 1. Login
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "admin@ledgerline.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  say("✓ login admin");

  // 2. Tunggu workspace + panel
  await page.waitForSelector(".dv-dockview", { timeout: 20000 });
  await page.waitForSelector("text=KPI Ringkasan", { timeout: 15000 });
  say("✓ workspace dockview tampil");

  // Reset dulu biar state bersih
  await page.click("text=Reset Layout");
  await page.waitForTimeout(800);

  // 2b. Preset switcher: ganti ke JUNIOR → badge & jumlah panel berubah, persist setelah reload
  await page.selectOption("select[aria-label='Ganti preset layout']", "JUNIOR");
  await page.waitForTimeout(1200);
  const juniorBadge = await page.getByText("Preset Junior — fokus antrian").count();
  const juniorTabs = await page.locator(".dv-tab").count();
  say(juniorBadge > 0 ? "✓ preset JUNIOR aktif (badge)" : "✗ badge preset JUNIOR tidak muncul");
  say(juniorTabs === 3 ? "✓ preset JUNIOR = 3 panel (pipeline/sla/kpi)" : `✗ preset JUNIOR panel=${juniorTabs} (harus 3)`);
  await page.reload();
  await page.waitForSelector(".dv-dockview", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const juniorAfterReload = await page.getByText("Preset Junior — fokus antrian").count();
  say(juniorAfterReload > 0 ? "✓ setelah reload, preset JUNIOR tetap (persist)" : "✗ preset JUNIOR hilang setelah reload");
  await page.selectOption("select[aria-label='Ganti preset layout']", "ADMIN");
  await page.waitForTimeout(1000);

  // 3. Tutup panel "Monitoring SLA" lewat tombol close tab-nya
  const slaTab = page.locator(".dv-tab", { hasText: "Monitoring SLA" }).first();
  const closeBtn = slaTab.locator("[role=button]").first();
  await closeBtn.click({ timeout: 5000 });
  await page.waitForTimeout(1200);
  say("✓ panel Monitoring SLA ditutup");

  // 4. Layout tersimpan di server?
  const saved = await page.evaluate(() =>
    fetch("/api/dashboard/layout").then((r) => r.json()),
  );
  const hasLayout = typeof saved.layout === "string" && saved.layout.length > 50;
  say(hasLayout ? "✓ layout tersimpan di server (len=" + saved.layout.length + ")" : "✗ layout TIDAK tersimpan");

  // 5. Reload → panel SLA tetap hilang
  await page.reload();
  await page.waitForSelector(".dv-dockview", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const slaVisibleAfterReload = await page.locator(".dv-tab", { hasText: "Monitoring SLA" }).count();
  say(slaVisibleAfterReload === 0 ? "✓ setelah reload, SLA tetap tertutup (persist OK)" : "✗ setelah reload SLA muncul lagi (persist GAGAL)");

  // 6. Reset → panel kembali
  await page.click("text=Reset Layout");
  await page.waitForTimeout(1000);
  const slaBack = await page.locator(".dv-tab", { hasText: "Monitoring SLA" }).count();
  say(slaBack > 0 ? "✓ reset mengembalikan panel SLA" : "✗ reset tidak mengembalikan panel");

  await browser.close();
  const pass = log.filter((l) => l.startsWith("✗")).length === 0;
  console.log(pass ? "\n=== E2E PASS ===" : "\n=== E2E FAIL ===");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error("E2E ERROR:", e.message);
  process.exit(1);
});
