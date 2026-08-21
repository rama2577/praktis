/**
 * Path chrome headless untuk E2E Playwright (scripts/*.ts).
 *
 * Chrome di-pin (pinned) ke build `chromium-1234` dari Playwright cache,
 * bukan channel sistem, supaya hasil konsisten antar run.
 *
 * Override: set env `CHROMIUM_PATH` ke path chrome lain.
 */
export const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ??
  "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
