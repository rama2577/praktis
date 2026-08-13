import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // SE-05 — isolasi lintas-origin tambahan (CSP dinamis di middleware)
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Railway/Vercel production: server standalone (output tracing otomatis)
  output: "standalone",
  // PDFKit, mupdf (wasm) & tesseract.js (OCR lokal) — jangan di-bundle webpack
  serverExternalPackages: ["pdfkit", "mupdf", "tesseract.js", "tesseract.js-core"],
  // Font PDFKit, wasm mupdf/tesseract & tessdata perlu ikut di standalone output
  outputFileTracingIncludes: {
    "/api/documents/*": [
      "./node_modules/pdfkit/js/data/*.afm",
      "./node_modules/mupdf/dist/*.wasm",
      "./node_modules/tesseract.js-core/*.wasm",
      "./node_modules/tesseract.js/src/worker-script/**/*",
      "./src/ai/tessdata/*.gz",
    ],
    "/api/portal/*": [
      "./node_modules/pdfkit/js/data/*.afm",
      "./node_modules/mupdf/dist/*.wasm",
      "./node_modules/tesseract.js-core/*.wasm",
      "./node_modules/tesseract.js/src/worker-script/**/*",
      "./src/ai/tessdata/*.gz",
    ],
    "/api/clients/import/*": ["./node_modules/mupdf/dist/*.wasm"],
  },
  async headers() {
    const headers = [...securityHeaders];
    // HSTS hanya di produksi — jangan aktif di localhost (browser meng-cache-nya).
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
