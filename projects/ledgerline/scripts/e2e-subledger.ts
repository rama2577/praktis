/**
 * E2E — Gap #1 Subledger & Aging.
 * 1. Bersihkan klien ARYA (agar import deterministik)
 * 2. Import ASC_2026.xlsx via wizard UI
 * 3. Buka halaman klien → Buku Besar Pembantu: aging tampil, master CT-x/SH-x ada
 * 4. Buka buku besar pembantu CT-001 → transaksi + running balance
 */
import { chromium } from "@playwright/test";
import { seedSubledgerDemo } from "./seed-subledger-demo";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  const check = (c: boolean, m: string) => {
    console.log(`${c ? "✓" : "✗"} ${m}`);
    if (!c) failed = true;
  };

  try {
    // 0. Bersihkan klien ARYA via API (login + DELETE langsung DB tidak bisa dari browser; pakai prisma via node di luar)
    //    → dilakukan sebelum browser: script ini hanya UI. Hapus via fetch ke /api tidak tersedia; jalankan prisma cleanup di luar.

    // 1. Login
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', "admin@ledgerline.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("✓ login");

    // 2. Import ASC_2026 (wizard)
    await page.goto(`${BASE}/dashboard/clients`);
    await page.waitForSelector("text=Import Kertas Kerja", { timeout: 15000 });
    await page.click("text=Import Kertas Kerja");
    await page.waitForSelector("text=Langkah 1 dari 3", { timeout: 10000 });
    await page.setInputFiles('input[type="file"]', XLSX);
    await page.click("text=Tinjau →");
    await page.waitForSelector("text=Langkah 2 dari 3", { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.click("text=Import 193 akun");
    await page.waitForSelector("text=Import selesai", { timeout: 60000 });
    console.log("✓ import selesai");

    // 3. Seed demo: hubungkan piutang ke CT-001/CT-002 + jurnal berumur bervariasi
    const target = await prisma.client.findFirst({ where: { name: { contains: "ARYA USAHA TIRTA" } }, select: { id: true } });
    if (target) {
      const r = await seedSubledgerDemo(target.id);
      console.log(`✓ seed subledger demo (${r.linkedLines} lines, ${r.journalsAdded} jurnal)`);
    }

    // 4. Buka klien → Buku Besar Pembantu
    await page.click("text=Buka klien →");
    await page.waitForURL("**/dashboard/clients/**", { timeout: 15000 });
    await page.waitForSelector("text=Aging Piutang", { timeout: 20000 });
    const body = await page.textContent("body") ?? "";
    check(body.includes("Aging Piutang"), "aging piutang tampil");
    check(body.includes("CT-001"), "master CT-001 tampil");
    check(body.includes("Pelanggan") && body.includes("Pemasok"), "kolom tipe pelanggan/pemasok tampil");

    // 4. Buku besar pembantu CT-001
    const btn = page.locator("tr", { hasText: "CT-001" }).locator("button", { hasText: "Buku Besar" }).first();
    await btn.click();
    await page.waitForSelector("text=Buku Besar Pembantu —", { timeout: 15000 });
    await page.waitForTimeout(1200);
    const ledgerBody = await page.textContent("body") ?? "";
    check(ledgerBody.includes("Saldo") && (ledgerBody.includes("Debet") || ledgerBody.includes("Kredit")), "buku besar pembantu menampilkan transaksi");
    check(/Rp\s?[\d.,]+/.test(ledgerBody), "running balance tampil (format Rp)");

    console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  } catch (e) {
    console.log(`ERROR: ${(e as Error).message}`);
    await page.screenshot({ path: "/Users/staff/.openclaw-autoclaw/workspace/.openclaw/tmp/e2e-subledger-error.png", fullPage: true }).catch(() => {});
    failed = true;
    console.log("RESULT: FAIL");
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
