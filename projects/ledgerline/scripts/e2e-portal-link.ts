/**
 * E2E — Portal Link: login → halaman klien → klik "Salin Link Portal" →
 * intercept URL token → buka portal klien → verifikasi landing page.
 * Jalankan: npx tsx scripts/e2e-portal-link.ts
 */
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = process.env.APP_BASE ?? "http://localhost:3000";
let chromePath = process.env.CHROME_PATH ?? "";
if (!chromePath) {
  try {
    chromePath = execSync(
      `find "${process.env.HOME}/Library/Caches/ms-playwright" -name "Google Chrome for Testing" -type f | head -1`,
    )
      .toString()
      .trim();
  } catch {
    chromePath = "";
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let portalUrl: string | null = null;
  page.on("response", async (res) => {
    if (res.url().includes("/portal-token")) {
      try {
        const data = (await res.json()) as { url?: string };
        if (data.url) portalUrl = data.url;
      } catch {
        /* ignore */
      }
    }
  });

  // 1) Login admin
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByLabel(/email/i).fill("admin@ledgerline.dev");
  await page.getByLabel(/password|kata sandi/i).fill("password123");
  await page.getByRole("button", { name: /masuk|login|sign in/i }).click();
  await page.waitForURL("**/dashboard**", { timeout: 45000 });

  // 2) Buka daftar klien → klien pertama
  await page.goto(`${BASE}/dashboard/clients`, { waitUntil: "networkidle", timeout: 45000 });
  const clientLink = page.locator("a[href*='/dashboard/clients/']").first();
  const href = await clientLink.getAttribute("href");
  if (!href) throw new Error("Tidak ada klien di daftar");
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle", timeout: 45000 });

  // 3) Klik "Salin Link Portal"
  const btn = page.getByRole("button", { name: /salin link portal/i });
  await btn.waitFor({ timeout: 15000 });
  await btn.click();
  await page.getByRole("button", { name: /tersalin/i }).waitFor({ timeout: 15000 });
  if (!portalUrl) throw new Error("API portal-token tidak merespons URL");
  console.log("PORTAL URL:", portalUrl);

  // 4) Buka portal klien (landing page)
  const target = portalUrl.startsWith("http") ? portalUrl : `${BASE}${portalUrl}`;
  await page.goto(target, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByText(/portal dokumen/i).first().waitFor({ timeout: 15000 });
  const title = await page.title();
  const hasUpload = (await page.getByText(/upload dokumen baru/i).count()) > 0;
  const hasSteps = (await page.getByText(/ai memproses/i).count()) > 0;
  const shot = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    ".openclaw",
    "tmp",
    "portal-landing.png",
  );
  await page.screenshot({ path: shot, fullPage: false });
  console.log("PORTAL OK — title:", title, "| upload:", hasUpload, "| cara-kerja:", hasSteps);
  console.log("SCREENSHOT:", shot);
  await browser.close();
}

main().catch((err) => {
  console.error("E2E GAGAL:", err.message);
  process.exit(1);
});
