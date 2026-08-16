import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/server/**", "src/ai/**", "src/components/**"],
      exclude: ["src/ai/knowledge/**", "src/ai/**/*.d.ts"],
      thresholds: {
        // SQ-01: quality gate — naikkan bertahap (baseline 2026-08-09; QW-6 naikkan branches)
        statements: 33,
        branches: 35,
        functions: 25,
        lines: 33,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
