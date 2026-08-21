import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce } from "@/lib/csp";

describe("CSP builder (SE-05)", () => {
  it("menghasilkan nonce acak yang berbeda", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });

  it("produksi: ketat — nonce, tanpa unsafe-inline/unsafe-eval script", () => {
    const csp = buildCsp("abc123", { dev: false });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    // script-src TIDAK boleh mengandung unsafe-inline/unsafe-eval di produksi
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src")) ?? "";
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("ws:");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'"); // next/font inline font-face
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("font-src 'self' data:");
  });

  it("dev: melonggarkan HMR — unsafe-eval + websocket lokal", () => {
    const csp = buildCsp("nonce-dev", { dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://localhost:*");
    expect(csp).toContain("http://127.0.0.1:*");
    expect(csp).toContain("script-src 'self' 'nonce-nonce-dev'");
  });

  it("nonce berbeda → CSP berbeda", () => {
    expect(buildCsp("n1")).not.toBe(buildCsp("n2"));
  });
});
