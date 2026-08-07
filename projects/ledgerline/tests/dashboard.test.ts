import { describe, expect, it } from "vitest";
import {
  automationPct,
  deltaVsAverage,
  daysSince,
  successfulAutomationPct,
  IN_PROCESS_STATUSES,
} from "@/server/dashboard";

describe("KPI helpers", () => {
  it("automationPct: 0 jika tidak ada jurnal; 1 desimal", () => {
    expect(automationPct(0, 0)).toBe(0);
    expect(automationPct(10, 0)).toBe(0);
    expect(automationPct(22, 22)).toBe(100);
    expect(automationPct(21, 22)).toBe(95.5);
    expect(automationPct(1, 3)).toBe(33.3);
  });

  it("successfulAutomationPct: jurnal AI tanpa exception dibagi total", () => {
    expect(successfulAutomationPct(0, 0)).toBe(0);
    expect(successfulAutomationPct(21, 22)).toBe(95.5);
    expect(successfulAutomationPct(1, 22)).toBe(4.5);
  });

  it("deltaVsAverage: null jika baseline 0; 0 jika sama", () => {
    expect(deltaVsAverage(22, 0)).toBeNull();
    expect(deltaVsAverage(22, 22)).toBe(0);
    expect(deltaVsAverage(30, 20)).toBe(50);
    expect(deltaVsAverage(10, 20)).toBe(-50);
  });

  it("daysSince: minimal 1; membulatkan ke atas per hari", () => {
    const now = new Date("2026-08-07T10:00:00Z");
    expect(daysSince(new Date("2026-08-07T10:00:00Z"), now)).toBe(1);
    expect(daysSince(new Date("2026-08-06T10:00:00Z"), now)).toBe(1);
    expect(daysSince(new Date("2026-08-06T09:59:00Z"), now)).toBe(2);
    expect(daysSince(new Date("2026-08-01T00:00:00Z"), now)).toBe(7);
    // data di masa depan → fallback 1
    expect(daysSince(new Date("2026-08-08T00:00:00Z"), now)).toBe(1);
  });

  it("IN_PROCESS_STATUSES mencakup semua tahap aktif", () => {
    expect(IN_PROCESS_STATUSES).toContain("DRAFT");
    expect(IN_PROCESS_STATUSES).toContain("JUNIOR_REVIEW");
    expect(IN_PROCESS_STATUSES).toContain("SENIOR_REVIEW");
    expect(IN_PROCESS_STATUSES).toContain("TAX_REVIEW");
    expect(IN_PROCESS_STATUSES).toContain("PARTNER_APPROVAL");
    expect(IN_PROCESS_STATUSES).not.toContain("APPROVED");
    expect(IN_PROCESS_STATUSES).not.toContain("REJECTED");
  });
});
