import { defineConfig } from "@playwright/test";

/**
 * E2E Playwright (SQ-07).
 * - Lokal: `npm run test:e2e` (webServer `npm run dev`, reuseExistingServer).
 * - CI: server sudah di-start oleh step Integration (`next start`), Playwright
 *   me-reuse server via `reuseExistingServer: true`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
