import { describe, expect, it } from "vitest";
import { buildAnomalies } from "@/server/anomaly";

describe("buildAnomalies", () => {
  it("tanpa masalah → daftar kosong", () => {
    expect(buildAnomalies({ slaBreach: 0, unmatched: 0, exceptions: 0 })).toEqual([]);
  });

  it("SLA breach → severity high", () => {
    const a = buildAnomalies({ slaBreach: 3, unmatched: 0, exceptions: 0 });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ type: "sla", severity: "high", count: 3 });
  });

  it("unmatched + exception → medium, dua item", () => {
    const a = buildAnomalies({ slaBreach: 0, unmatched: 5, exceptions: 2 });
    expect(a).toHaveLength(2);
    expect(a.map((x) => x.type).sort()).toEqual(["exception", "recon"]);
    expect(a.every((x) => x.severity === "medium")).toBe(true);
  });
});
