import { describe, it, expect } from "vitest";
import { avgMinutes, pct } from "../src/server/metrics";

describe("avgMinutes", () => {
  it("menghitung rata-rata menit dengan 1 desimal", () => {
    expect(avgMinutes([10, 20, 30])).toBe(20);
    expect(avgMinutes([5.5, 6.5])).toBe(6);
  });

  it("null jika tidak ada data", () => {
    expect(avgMinutes([])).toBeNull();
  });
});

describe("pct", () => {
  it("persentase 1 desimal", () => {
    expect(pct(5, 10)).toBe(50);
    expect(pct(1, 3)).toBe(33.3);
  });

  it("0 jika total 0", () => {
    expect(pct(5, 0)).toBe(0);
  });
});
