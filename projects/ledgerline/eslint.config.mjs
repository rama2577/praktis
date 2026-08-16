import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefak lokal & alat dev:
    "coverage/**",
    "uploads/**",
    "playwright-report/**",
    "test-results/**",
    // Skrip dev sekali-pakai (eksplorasi/rekaman video) — bukan kode app;
    // memakai require() CommonJS, tidak perlu lint aturan app.
    "scripts/_explore-live.js",
    "scripts/_explore-live2.js",
    "scripts/_explore-live3.js",
    "scripts/make-slides.js",
    "scripts/record-clips.js",
    "scripts/record-demo.js",
  ]),
]);

export default eslintConfig;
