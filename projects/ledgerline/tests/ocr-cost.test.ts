import { describe, expect, it } from "vitest";
import { estimateOcrCostUsd, estimateOcrTokens, usdToIdr } from "@/lib/ocr-cost";

describe("estimateOcrTokens (hybrid OCR)", () => {
  it("OCR lokal murni = 0 token vision, hanya teks", () => {
    const meta = { usedVision: false, usedStrong: false, pageCount: 1, textChars: 2_000 };
    expect(estimateOcrTokens(meta)).toBe(500); // 2.000 × 0,25
  });

  it("vision dipakai → token halaman × 1.200 + teks", () => {
    const meta = { usedVision: true, usedStrong: false, pageCount: 3, textChars: 4_000 };
    expect(estimateOcrTokens(meta)).toBe(3 * 1_200 + 1_000);
  });
});

describe("estimateOcrCostUsd", () => {
  it("lokal murni = $0", () => {
    expect(estimateOcrCostUsd({ usedVision: false, usedStrong: false, pageCount: 2 })).toBe(0);
  });

  it("vision (glm-4.5) per halaman", () => {
    // 1 halaman × 1.200 token @ $0,7/M = $0,00084
    expect(estimateOcrCostUsd({ usedVision: true, usedStrong: false, pageCount: 1 })).toBeCloseTo(0.00084, 5);
  });

  it("strong (glm-4.6) 4× lebih mahal per halaman", () => {
    const strong = estimateOcrCostUsd({ usedVision: true, usedStrong: true, pageCount: 1 });
    const vision = estimateOcrCostUsd({ usedVision: true, usedStrong: false, pageCount: 1 });
    expect(strong).toBeCloseTo(vision * 4, 5);
  });
});

describe("usdToIdr", () => {
  it("konversi kurs default 15.800", () => {
    expect(usdToIdr(1)).toBe(15_800);
    expect(usdToIdr(0.00084)).toBe(13);
  });
});
