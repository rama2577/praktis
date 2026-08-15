import { describe, expect, it } from "vitest";
import { filterSortCoa } from "@/components/queues/coa-select";

const COA = [
  { accountCode: "1-1100", accountName: "Kas dan Setara Kas" },
  { accountCode: "1-1200", accountName: "Piutang Usaha" },
  { accountCode: "5-1000", accountName: "Beban Gaji" },
  { accountCode: "2-1100", accountName: "Utang Usaha" },
];

describe("filterSortCoa", () => {
  it("urut abjad nama akun", () => {
    const list = filterSortCoa(COA, "");
    expect(list.map((a) => a.accountName)).toEqual([
      "Beban Gaji",
      "Kas dan Setara Kas",
      "Piutang Usaha",
      "Utang Usaha",
    ]);
  });

  it("filter by nama", () => {
    const list = filterSortCoa(COA, "kas");
    expect(list.map((a) => a.accountCode)).toEqual(["1-1100"]);
  });

  it("filter by kode", () => {
    const list = filterSortCoa(COA, "5-1");
    expect(list.map((a) => a.accountCode)).toEqual(["5-1000"]);
  });

  it("tanpa hasil → array kosong", () => {
    expect(filterSortCoa(COA, "zzz")).toEqual([]);
  });
});
