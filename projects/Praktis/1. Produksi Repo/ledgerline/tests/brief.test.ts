import { describe, expect, it } from "vitest";
import { buildBriefSummary } from "@/server/brief";
import type { BriefItem } from "@/server/brief";

describe("buildBriefSummary (ringkasan deterministik)", () => {
  it("merangkai item dengan count > 0", () => {
    const items: BriefItem[] = [
      { kind: "documents", text: "dokumen baru", count: 3, href: "/x" },
      { kind: "review", text: "jurnal menunggu review", count: 2, href: "/y" },
      { kind: "exception", text: "exception", count: 0, href: "/z" },
    ];
    const s = buildBriefSummary(items);
    expect(s).toContain("3 dokumen baru");
    expect(s).toContain("2 jurnal menunggu review");
    expect(s).not.toContain("exception");
  });

  it("tanpa antrian → pesan beres", () => {
    const items: BriefItem[] = [
      { kind: "documents", text: "dokumen baru", count: 0, href: "/x" },
      { kind: "review", text: "jurnal menunggu review", count: 0, href: "/y" },
    ];
    expect(buildBriefSummary(items)).toBe("Semua beres — tidak ada antrian yang menunggu.");
  });
});
