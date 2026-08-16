import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    client: { findUnique: vi.fn() },
    journalLine: { count: vi.fn() },
    firm: { findUnique: vi.fn() },
  };
  return { prismaMock };
});

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import {
  currentPeriod,
  DEFAULT_QUOTA_MONTHLY,
  getClientQuota,
  getUsage,
  isSptAnnualUnlocked,
} from "@/server/billing";

describe("billing — currentPeriod", () => {
  it("format YYYY-MM", () => {
    expect(currentPeriod(new Date(2026, 0, 15))).toBe("2026-01");
    expect(currentPeriod(new Date(2026, 11, 1))).toBe("2026-12");
  });
});

describe("billing — getClientQuota", () => {
  beforeEach(() => prismaMock.client.findUnique.mockReset());

  it("fallback ke default bila klien tanpa override", async () => {
    prismaMock.client.findUnique.mockResolvedValue(null);
    expect(await getClientQuota("c1")).toBe(DEFAULT_QUOTA_MONTHLY);
  });

  it("pakai override klien", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ quotaMonthly: 1000 });
    expect(await getClientQuota("c1")).toBe(1000);
  });
});

describe("billing — getUsage", () => {
  beforeEach(() => {
    prismaMock.client.findUnique.mockReset();
    prismaMock.journalLine.count.mockReset();
  });

  it("di atas kuota → overQuota dihitung, remaining 0", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ quotaMonthly: 500 });
    prismaMock.journalLine.count.mockResolvedValue(620);
    const u = await getUsage("c1", "2026-08");
    expect(u).toEqual({ period: "2026-08", used: 620, quota: 500, overQuota: 120, remaining: 0 });
  });

  it("di bawah kuota → overQuota 0", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ quotaMonthly: 500 });
    prismaMock.journalLine.count.mockResolvedValue(100);
    const u = await getUsage("c1", "2026-08");
    expect(u.overQuota).toBe(0);
    expect(u.remaining).toBe(400);
  });
});

describe("billing — paywall SPT (isSptAnnualUnlocked)", () => {
  const OLD = process.env.BILLING_ENFORCE;
  beforeEach(() => prismaMock.firm.findUnique.mockReset());
  afterEach(() => {
    if (OLD === undefined) delete process.env.BILLING_ENFORCE;
    else process.env.BILLING_ENFORCE = OLD;
  });

  it("enforce off (default) → selalu terbuka", async () => {
    delete process.env.BILLING_ENFORCE;
    expect(await isSptAnnualUnlocked("f1")).toBe(true);
  });

  it("enforce on + belum bayar → terkunci", async () => {
    process.env.BILLING_ENFORCE = "true";
    prismaMock.firm.findUnique.mockResolvedValue({ annualPaidAt: null });
    expect(await isSptAnnualUnlocked("f1")).toBe(false);
  });

  it("enforce on + annualPaidAt baru → terbuka", async () => {
    process.env.BILLING_ENFORCE = "true";
    prismaMock.firm.findUnique.mockResolvedValue({ annualPaidAt: new Date() });
    expect(await isSptAnnualUnlocked("f1")).toBe(true);
  });

  it("enforce on + annualPaidAt > 1 tahun → terkunci (expired)", async () => {
    process.env.BILLING_ENFORCE = "true";
    const old = new Date();
    old.setFullYear(old.getFullYear() - 2);
    prismaMock.firm.findUnique.mockResolvedValue({ annualPaidAt: old });
    expect(await isSptAnnualUnlocked("f1")).toBe(false);
  });
});
