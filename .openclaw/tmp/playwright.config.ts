import { defineConfig, devices } from "@playwright/test";

// E2E smoke: jalankan terhadap produksi secara default (aman — pakai tenant demo)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://mio-erp.store";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
