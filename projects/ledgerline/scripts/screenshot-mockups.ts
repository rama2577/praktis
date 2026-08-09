/**
 * Screenshot semua mockup layar Praktis → PNG (untuk di-embed ke deck).
 * Jalankan: npx tsx scripts/screenshot-mockups.ts
 */
import { chromium } from "playwright";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const MOCK_DIR = path.join(process.cwd(), "..", "praktis-deck", "mockups");
const OUT_DIR = path.join(process.cwd(), "..", "praktis-deck", "images");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await readdir(MOCK_DIR)).filter((f) => f.endsWith(".html")).sort();

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // retina — tajam untuk deck
  });

  for (const file of files) {
    const url = `file://${path.join(MOCK_DIR, file)}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const outName = file.replace(".html", ".png");
    await page.screenshot({ path: path.join(OUT_DIR, outName), fullPage: true });
    console.log("✓", outName);
  }

  await browser.close();
  console.log("Selesai →", OUT_DIR);
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
