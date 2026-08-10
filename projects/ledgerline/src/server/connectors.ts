/**
 * EN-09 — Konektor impor bank CSV (BCA, Mandiri, BRI).
 *
 * Format bank Indonesia yang umum. Parser mengekstrak transaksi
 * dari CSV statement untuk dijadikan dokumen impor pipeline.
 */

export type BankTransaction = {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positif = masuk, negatif = keluar (ternormalisasi)
  reference?: string; // nomor referensi/cabang
  balance?: number;
};

type CsvRow = Record<string, string>;

/** Deteksi format bank dari header CSV. */
function detectFormat(headers: string[]): "bca" | "mandiri" | "bri" | null {
  const h = headers.map((x) => x.toLowerCase().trim());
  if (h.includes("tanggal") && h.includes("keterangan") && h.includes("mutasi")) return "bca";
  if (h.includes("tgl") && h.includes("keterangan") && h.includes("jumlah")) return "mandiri";
  if (h.includes("tanggal") && h.includes("uraian") && h.includes("debit") && h.includes("kredit")) return "bri";
  return null;
}

/** Parse baris CSV BCA. */
function parseBca(row: CsvRow): BankTransaction | null {
  const date = row["Tanggal"]?.trim();
  const desc = row["Keterangan"]?.trim();
  const amountRaw = row["Mutasi"]?.replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const branch = row["Cabang"]?.trim();
  if (!date || !desc || !amountRaw) return null;
  return {
    date: normalizeDate(date),
    description: desc,
    amount: parseFloat(amountRaw),
    reference: branch || undefined,
  };
}

/** Parse baris CSV Mandiri. */
function parseMandiri(row: CsvRow): BankTransaction | null {
  const date = row["Tgl"]?.trim();
  const desc = row["Keterangan"]?.trim();
  const amountRaw = row["Jumlah"]?.replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!date || !desc || !amountRaw) return null;
  return {
    date: normalizeDate(date),
    description: desc,
    amount: parseFloat(amountRaw),
  };
}

/** Parse baris CSV BRI (debit/credit columns). */
function parseBri(row: CsvRow): BankTransaction | null {
  const date = row["Tanggal"]?.trim();
  const desc = row["Uraian"]?.trim();
  const debitRaw = row["Debit"]?.replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", ".");
  const creditRaw = row["Kredit"]?.replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", ".");
  if (!date || !desc) return null;
  const debit = debitRaw ? parseFloat(debitRaw) : 0;
  const credit = creditRaw ? parseFloat(creditRaw) : 0;
  return {
    date: normalizeDate(date),
    description: desc,
    amount: credit - debit, // positif = masuk, negatif = keluar
  };
}

/** Normalize date from DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD. */
function normalizeDate(raw: string): string {
  const d = raw.replace(/-/g, "/").split(/[/\s]/).filter(Boolean);
  if (d.length === 3) return `${d[2]}-${d[1].padStart(2, "0")}-${d[0].padStart(2, "0")}`;
  return raw; // fallback
}

/** Parse CSV string ke BankTransaction[], auto-detect format. */
export function parseBankCsv(csvText: string): {
  transactions: BankTransaction[];
  format: string | null;
  error?: string;
} {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { transactions: [], format: null, error: "CSV kosong atau hanya header" };

  const headers = parseCsvLine(lines[0]);
  const format = detectFormat(headers);
  if (!format) {
    return {
      transactions: [],
      format: null,
      error: `Format tidak dikenali. Header: ${headers.join(", ")}. Format didukung: BCA, Mandiri, BRI.`,
    };
  }

  const transactions: BankTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (Object.keys(row).length === 0) continue;
    const cols = mapRowColumns(row, headers);
    let tx: BankTransaction | null = null;
    if (format === "bca") tx = parseBca(cols);
    else if (format === "mandiri") tx = parseMandiri(cols);
    else if (format === "bri") tx = parseBri(cols);
    if (tx) transactions.push(tx);
  }

  return { transactions, format };
}

/** Simple CSV line parser (handles quoted fields). */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current); current = ""; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

/** Map CSV columns to named object based on headers. */
function mapRowColumns(values: string[], headers: string[]): CsvRow {
  const row: CsvRow = {};
  for (let i = 0; i < Math.min(headers.length, values.length); i++) {
    // Normalize header: capitalize first letter
    const key = headers[i].charAt(0).toUpperCase() + headers[i].slice(1).toLowerCase();
    row[key] = values[i];
  }
  return row;
}
