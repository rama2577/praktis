import { describe, it, expect } from "vitest";
import { suggestRuleFixes } from "@/server/feedback";

const acct = (before: string, after: string) => ({
  field: "accountCode",
  before: before === "" ? null : before,
  after: after === "" ? null : after,
});

describe("suggestRuleFixes (EN-03 feedback loop)", () => {
  it("mendeteksi pola akun yang berulang dikoreksi", () => {
    const fixes = suggestRuleFixes([
      acct("1-1200", "1-1100"),
      acct("1-1200", "1-1100"),
      acct("1-1200", "1-1100"),
      acct("5-5100", "5-5200"),
    ]);
    expect(fixes).toHaveLength(1);
    expect(fixes[0]).toMatchObject({ before: "1-1200", after: "1-1100", count: 3 });
    expect(fixes[0].suggestion).toContain("1-1200");
    expect(fixes[0].suggestion).toContain("1-1100");
  });

  it("abaikan koreksi non-akun (debit/credit/notes/nama akun)", () => {
    const fixes = suggestRuleFixes([
      { field: "debit", before: "100", after: "200" },
      { field: "notes", before: "a", after: "b" },
      { field: "accountName", before: "Kas", after: "Kas & Bank" },
    ]);
    expect(fixes).toHaveLength(0);
  });

  it("abaikan penambahan baris baru (before kosong) & penghapusan (after kosong)", () => {
    const fixes = suggestRuleFixes([
      acct("", "1-1100"), // baris baru
      acct("1-1200", ""), // baris dihapus
      acct("1-1200", "1-1200"), // tidak berubah
    ]);
    expect(fixes).toHaveLength(0);
  });

  it("menghormati ambang minimal kemunculan (minCount)", () => {
    const rows = [acct("1-1200", "1-1100"), acct("1-1200", "1-1100")];
    expect(suggestRuleFixes(rows, 2)).toHaveLength(1);
    expect(suggestRuleFixes(rows, 3)).toHaveLength(0);
  });

  it("mengurutkan berdasarkan frekuensi tertinggi", () => {
    const fixes = suggestRuleFixes([
      acct("5-5100", "5-5200"),
      acct("5-5100", "5-5200"),
      acct("1-1200", "1-1100"),
      acct("1-1200", "1-1100"),
      acct("5-5100", "5-5200"),
    ]);
    expect(fixes.map((f) => [f.before, f.after, f.count])).toEqual([
      ["5-5100", "5-5200", 3],
      ["1-1200", "1-1100", 2],
    ]);
  });
});
