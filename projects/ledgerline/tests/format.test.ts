import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/format";

const now = new Date("2026-08-07T12:00:00Z");

describe("formatRelativeTime", () => {
  it("di bawah 1 menit → baru saja", () => {
    expect(formatRelativeTime(new Date("2026-08-07T11:59:30Z"), now)).toBe("baru saja");
  });

  it("menit", () => {
    expect(formatRelativeTime(new Date("2026-08-07T11:55:00Z"), now)).toBe("5 mnt lalu");
    expect(formatRelativeTime(new Date("2026-08-07T11:01:00Z"), now)).toBe("59 mnt lalu");
  });

  it("jam", () => {
    expect(formatRelativeTime(new Date("2026-08-07T10:00:00Z"), now)).toBe("2 jam lalu");
    expect(formatRelativeTime(new Date("2026-08-06T12:30:00Z"), now)).toBe("23 jam lalu");
  });

  it("hari", () => {
    expect(formatRelativeTime(new Date("2026-08-06T11:00:00Z"), now)).toBe("1 hari lalu");
    expect(formatRelativeTime(new Date("2026-07-20T00:00:00Z"), now)).toBe("18 hari lalu");
  });

  it("di atas 30 hari → tanggal lengkap", () => {
    expect(formatRelativeTime(new Date("2026-06-01T00:00:00Z"), now)).toMatch(/1 Jun 2026/);
  });

  it("timestamp masa depan → baru saja (tidak negatif)", () => {
    expect(formatRelativeTime(new Date("2026-08-07T13:00:00Z"), now)).toBe("baru saja");
  });
});
