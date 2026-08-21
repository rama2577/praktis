import { describe, expect, it, vi } from "vitest";
import { emit, listenerCount, on } from "@/lib/events";

describe("event bus (EN-05)", () => {
  it("meneruskan payload ke listener", () => {
    const fn = vi.fn();
    const off = on("journalApproved", fn);
    emit("journalApproved", { journalId: "j1", firmId: "f1", clientId: "c1" });
    expect(fn).toHaveBeenCalledWith({ journalId: "j1", firmId: "f1", clientId: "c1" });
    off();
  });

  it("unsubscribe menghentikan penerimaan", () => {
    const fn = vi.fn();
    const off = on("journalException", fn);
    off();
    emit("journalException", { journalId: "j2", firmId: "f1", clientId: "c1", flag: "x" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("satu listener error tidak memblokir listener lain", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const offBad = on("slaBreach", bad);
    const offGood = on("slaBreach", good);

    emit("slaBreach", { firmId: "f1", stage: "JUNIOR" });

    expect(good).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
    offBad();
    offGood();
    errSpy.mockRestore();
  });

  it("emit tanpa listener tidak error", () => {
    expect(() => emit("journalApproved", { journalId: "j3", firmId: "f1", clientId: "c1" })).not.toThrow();
  });

  it("listenerCount memantau pendengar aktif", () => {
    const fn = vi.fn();
    const off = on("journalApproved", fn);
    expect(listenerCount("journalApproved")).toBeGreaterThan(0);
    off();
    const before = listenerCount("journalApproved");
    off();
    expect(listenerCount("journalApproved")).toBe(before);
  });
});
