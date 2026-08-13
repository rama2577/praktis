/**
 * Screenshot APP LIVE Praktis → PNG retina (untuk di-embed ke deck).
 * Fitur-fitur baru: dashboard dockable, ikhtisar multi-periode, worksheet 10 kolom,
 * management letter, annual report + sign-off, aset, SLA, kualitas, klien.
 *
 * Jalankan: npx tsx scripts/screenshot-app.ts
 * Output: ../praktis-deck/images-app/app-*.png
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "..", "praktis-deck", "images-app");
const EMAIL = "admin@ledgerline.dev";
const PASSWORD = "password123";

type Shot = {
  name: string;
  url: string;
  waitFor?: string;
  settleMs?: number;
  /** aksi opsional setelah load (mis. klik tab) */
  action?: (page: import("playwright").Page) => Promise<void>;
};

const SHOTS: Shot[] = [
  { name: "app-01-dashboard-dockable", url: "/dashboard", waitFor: ".dv-dockview", settleMs: 2500 },
  { name: "app-02-pipeline", url: "/dashboard/pipeline", waitFor: "text=Pipeline Produksi", settleMs: 1200 },
  { name: "app-03-worksheet-10-kolom", url: "/dashboard/reports/trial-balance", waitFor: "text=Neraca Percobaan", settleMs: 1500 },
  { name: "app-04-ikhtisar-multi-periode", url: "/dashboard/reports/financial", waitFor: "text=Ikhtisar Keuangan Multi-Periode", settleMs: 4000 },
  {
    name: "app-05-management-letter",
    url: "/dashboard/reports/financial",
    waitFor: "text=Ikhtisar Keuangan Multi-Periode",
    settleMs: 1500,
    action: async (page) => {
      await page.getByRole("button", { name: "Mgmt Letter" }).click();
      await page.waitForTimeout(3500);
    },
  },
  {
    name: "app-06-annual-report-signoff",
    url: "/dashboard/reports/financial",
    waitFor: "text=Ikhtisar Keuangan Multi-Periode",
    settleMs: 1500,
    action: async (page) => {
      await page.getByRole("button", { name: "Laporan", exact: true }).click();
      await page.waitForTimeout(3500);
    },
  },
  { name: "app-07-aset-tetap", url: "/dashboard/assets", waitFor: "text=Aset", settleMs: 1500 },
  { name: "app-08-sla", url: "/dashboard/sla", waitFor: "text=SLA", settleMs: 1500 },
  { name: "app-09-kualitas", url: "/dashboard/quality", waitFor: "text=Kualitas", settleMs: 1500 },
  { name: "app-10-klien", url: "/dashboard/clients", waitFor: "text=Klien", settleMs: 1500 },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      "/Users/staff/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  // Login sekali
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  console.log("✓ login");

  let ok = 0;
  for (const shot of SHOTS) {
    try {
      await page.goto(`${BASE}${shot.url}`, { waitUntil: "networkidle" });
      if (shot.waitFor) await page.waitForSelector(shot.waitFor, { timeout: 20000 });
      if (shot.action) await shot.action(page);
      if (shot.settleMs) await page.waitForTimeout(shot.settleMs);
      await page.screenshot({ path: path.join(OUT_DIR, `${shot.name}.png`) });
      console.log("✓", shot.name);
      ok++;
    } catch (e) {
      console.log("✗", shot.name, "-", (e as Error).message.slice(0, 120));
    }
  }
  await browser.close();
  console.log(`\nSelesai: ${ok}/${SHOTS.length} → ${OUT_DIR}`);
  process.exit(ok >= SHOTS.length - 2 ? 0 : 1);
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
