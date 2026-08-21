/**
 * K3 — Penjelasan jurnal dalam bahasa sederhana untuk portal klien.
 * Murni & deterministik agar mudah diuji.
 */

export type ExplainLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

export type ExplainJournal = {
  id: string;
  description: string | null;
  entryDate: string;
  lines: ExplainLine[];
};

const CLASS_PHRASES: Record<string, { debit: string; credit: string }> = {
  ASET: { debit: "aset bertambah", credit: "aset berkurang" },
  LIABILITAS: { debit: "utang/kewajiban berkurang", credit: "utang/kewajiban bertambah" },
  EKUITAS: { debit: "ekuitas berkurang", credit: "ekuitas bertambah" },
  PENDAPATAN: { debit: "pendapatan berkurang", credit: "pendapatan bertambah" },
  BEBAN: { debit: "beban/ biaya bertambah", credit: "beban/biaya berkurang" },
  LAINNYA: { debit: "dicatat di sisi debit", credit: "dicatat di sisi kredit" },
};

/** Klasifikasi dari digit pertama kode akun (sama dengan trial-balance). */
export function classify(code: string): string {
  switch (code.trim().charAt(0)) {
    case "1":
      return "ASET";
    case "2":
      return "LIABILITAS";
    case "3":
      return "EKUITAS";
    case "4":
      return "PENDAPATAN";
    case "5":
      return "BEBAN";
    default:
      return "LAINNYA";
  }
}

function rupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function linePhrase(line: ExplainLine): string {
  const cls = classify(line.accountCode);
  const phrases = CLASS_PHRASES[cls] ?? CLASS_PHRASES.LAINNYA;
  if (line.debit > 0) {
    return `${line.accountName} (debit ${rupiah(line.debit)}) — ${phrases.debit}`;
  }
  return `${line.accountName} (kredit ${rupiah(line.credit)}) — ${phrases.credit}`;
}

/** Satu kalimat ringkas per jurnal, bahasa non-akuntan. */
export function explainJournal(journal: ExplainJournal): string {
  const date = new Date(journal.entryDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines = journal.lines
    .map(linePhrase)
    .join("; ");
  const desc = journal.description?.trim() ? `Transaksi: ${journal.description.trim()}. ` : "";
  return `${date}. ${desc}Pencatatan: ${lines}.`;
}

/** Ringkasan dampak transaksi (baris pembuka untuk UI). */
export function summarizeJournal(journal: ExplainJournal): string {
  const debits = journal.lines.filter((l) => l.debit > 0);
  const credits = journal.lines.filter((l) => l.credit > 0);
  const total = debits.reduce((s, l) => s + l.debit, 0);
  const debitNames = debits.map((l) => l.accountName).join(", ");
  const creditNames = credits.map((l) => l.accountName).join(", ");
  if (total > 0) {
    return `Mencatat ${rupiah(total)}: ${debitNames} (debit) diimbangi ${creditNames} (kredit).`;
  }
  return "Jurnal tanpa nilai.";
}
