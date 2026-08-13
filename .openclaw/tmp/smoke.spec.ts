import { test, expect } from "@playwright/test";

// Smoke test alur kritis — pakai tenant demo (admindemo / mio123), data kosong, aman.
// Login non-admin pakai username → email sintetis; demo tenant = tenant terpisah.

test("halaman beranda (landing) tampil dengan benar", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveTitle(/Mio ERP/);
});

test("halaman login tampil untuk tamu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Email atau Username")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("login tenant demo → dashboard muncul", async ({ page }) => {
  const email = process.env.E2E_DEMO_EMAIL || "admindemo";
  const password = process.env.E2E_DEMO_PASSWORD || "mio123";

  await page.goto("/");
  await page.getByLabel("Email atau Username").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();

  // Setelah login: tidak lagi tampil form login
  await expect(page.getByLabel("Email atau Username")).toBeHidden({ timeout: 30_000 });
});
