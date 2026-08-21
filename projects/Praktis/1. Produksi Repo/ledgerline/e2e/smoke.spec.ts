import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke E2E (SQ-07) — alur utama di browser nyata.
 * Kredensial demo: admin@ledgerline.dev / password123 (dev) — override via env.
 * Server diasumsikan sudah jalan di baseURL (lihat playwright.config.ts).
 */
const EMAIL = process.env.E2E_EMAIL ?? "admin@ledgerline.dev";
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.DEMO_PASSWORD ?? "password123";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe("smoke — alur utama", () => {
  test("login admin → dashboard", async ({ page }) => {
    await login(page);
    // Sidebar menampilkan nama segmen firma (default: Firma Akuntan).
    await expect(page.getByText("Firma Akuntan")).toBeVisible();
  });

  test("halaman klien terbuka", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/clients");
    await expect(page.getByText(/Klien/i).first()).toBeVisible();
  });

  test("neraca percobaan terbuka", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/reports/trial-balance");
    await expect(page.getByText(/Neraca Percobaan/i).first()).toBeVisible();
  });
});
