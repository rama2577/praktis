import { describe, expect, it } from "vitest";
import { nextDeadlineDates } from "@/server/deadline";

describe("nextDeadlineDates (kalender Indonesia)", () => {
  it("PPN = akhir bulan berikutnya, PPh = tgl 20, Tahunan = 30 April", () => {
    const now = new Date(2026, 7, 15); // 15 Agustus 2026
    const d = nextDeadlineDates(now);
    const ppn = d.find((x) => x.type === "SPT Masa PPN")!;
    const pph = d.find((x) => x.type === "SPT Masa PPh 21/23")!;
    const annual = d.find((x) => x.type === "SPT Tahunan Badan")!;
    expect(ppn.due.getDate()).toBe(30); // 30 September (akhir bulan berikutnya)
    expect(ppn.due.getMonth()).toBe(8);
    expect(pph.due.getDate()).toBe(20);
    expect(pph.due.getMonth()).toBe(8);
    // 30 April 2026 sudah lewat → tahun depan
    expect(annual.due.getFullYear()).toBe(2027);
    expect(annual.due.getMonth()).toBe(3);
  });

  it("sebelum 30 April → SPT Tahunan tahun berjalan", () => {
    const now = new Date(2026, 2, 10); // 10 Maret 2026
    const annual = nextDeadlineDates(now).find((x) => x.type === "SPT Tahunan Badan")!;
    expect(annual.due.getFullYear()).toBe(2026);
    expect(annual.due.getMonth()).toBe(3);
  });
});
