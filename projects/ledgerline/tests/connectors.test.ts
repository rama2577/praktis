import { describe, it, expect } from "vitest";
import { parseBankCsv } from "../src/server/connectors";

const BCA_CSV = `Tanggal,Keterangan,Cabang,Mutasi
01/08/2026,Pembayaran dari PT Maju Jaya,Cabang Jakarta,5000000
02/08/2026,Transfer ke Supplier ABC,Cabang Jakarta,-2500000
03/08/2026,Biaya admin bulanan,, -15000`;

const MANDIRI_CSV = `Tgl,Keterangan,Jumlah
04/08/2026,Setoran tunai,10000000
05/08/2026,Tarik tunai ATM,-2000000`;

const BRI_CSV = `Tanggal,Uraian,Debit,Kredit
06/08/2026,Pendapatan jasa,0,8000000
07/08/2026,Pembayaran listrik,1250000,0`;

describe("parseBankCsv", () => {
  it("mendeteksi format BCA & parse transaksi", () => {
    const result = parseBankCsv(BCA_CSV);
    expect(result.format).toBe("bca");
    expect(result.error).toBeUndefined();
    expect(result.transactions).toHaveLength(3);
    expect(result.transactions[0]).toMatchObject({
      date: "2026-08-01",
      description: "Pembayaran dari PT Maju Jaya",
      amount: 5_000_000,
      reference: "Cabang Jakarta",
    });
    expect(result.transactions[1].amount).toBe(-2_500_000);
  });

  it("mendeteksi format Mandiri & parse transaksi", () => {
    const result = parseBankCsv(MANDIRI_CSV);
    expect(result.format).toBe("mandiri");
    expect(result.error).toBeUndefined();
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].amount).toBe(10_000_000);
    expect(result.transactions[1].amount).toBe(-2_000_000);
  });

  it("mendeteksi format BRI & parse debit/kredit", () => {
    const result = parseBankCsv(BRI_CSV);
    expect(result.format).toBe("bri");
    expect(result.error).toBeUndefined();
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].amount).toBe(8_000_000); // credit
    expect(result.transactions[1].amount).toBe(-1_250_000); // debit
  });

  it("menolak format tidak dikenal", () => {
    const result = parseBankCsv("Kolom1,Kolom2\nabc,123");
    expect(result.format).toBeNull();
    expect(result.error).toContain("Format tidak dikenali");
    expect(result.transactions).toHaveLength(0);
  });

  it("menolak CSV kosong", () => {
    const result = parseBankCsv("");
    expect(result.error).toContain("kosong");
    expect(result.transactions).toHaveLength(0);
  });

  it("skip baris kosong", () => {
    const csv = "Tanggal,Keterangan,Cabang,Mutasi\n\n01/08/2026,Tes A,Cab,1000\n\n02/08/2026,Tes B,Cab,-500\n";
    const result = parseBankCsv(csv);
    expect(result.format).toBe("bca");
    expect(result.transactions).toHaveLength(2);
  });

  it("normalize date DD/MM/YYYY → YYYY-MM-DD", () => {
    const csv = "Tanggal,Keterangan,Cabang,Mutasi\n15/12/2026,Tes,Cab,1000";
    const result = parseBankCsv(csv);
    expect(result.transactions[0].date).toBe("2026-12-15");
  });

  it("normalize date DD-MM-YYYY → YYYY-MM-DD", () => {
    const csv = "Tanggal,Keterangan,Cabang,Mutasi\n01-01-2026,Tes,Cab,1000";
    const result = parseBankCsv(csv);
    expect(result.transactions[0].date).toBe("2026-01-01");
  });
});
