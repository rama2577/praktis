/**
 * Rule Engine — deteksi business event & penyusunan draft jurnal
 * berbasis knowledge base ledgerline (journal-templates.md, tax-rules).
 * Murni (pure) & deterministik: tidak bergantung LLM, bisa diuji unit.
 *
 * Konvensi format Rupiah (knowledge base): "Rp 1.500.000" (titik ribuan,
 * koma desimal).
 */

export type RuleLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  psakRef: string;
  notes?: string;
};

export type DraftResult = {
  description: string;
  detectedEvent: string | null;
  template: string | null;
  lines: RuleLine[];
  confidence: number; // 0..1
  exceptionFlag: string | null;
};

export type EventKind = "SALES_CREDIT" | "SALES_CASH" | "PURCHASE" | "RECEIPT" | "PAYMENT";

// ── Parse nominal Rupiah ─────────────────────────────────────────────────

/**
 * Parse nominal gaya Indonesia: "Rp 1.500.000", "1.500.000,00", "Rp1.234.567".
 * - Titik = pemisah ribuan; koma = desimal.
 * - Return null jika tidak ada pola nominal yang valid.
 */
export function parseRupiah(text: string): number | null {
  const match =
    text.match(/Rp\.?\s*([\d.,]+)/i) ??
    text.match(/(^|\s)(\d{1,3}(?:\.\d{3})+(?:,\d+)?)(?=\s|$)/) ??
    text.match(/(^|\s)(\d+(?:,\d+)?)(?=\s|$)/);
  const raw = match ? (match[2] ?? match[1]) : null;
  if (!raw) return null;

  let normalized: string;
  if (raw.includes(",") && raw.includes(".")) {
    // "1.500.000,00" → hapus titik, koma jadi desimal
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    // "1500,50" → koma desimal
    normalized = raw.replace(",", ".");
  } else {
    // "1.500.000" atau "1500000" → titik adalah ribuan
    normalized = raw.replace(/\./g, "");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

// ── Deteksi business event ───────────────────────────────────────────────

type EventRule = {
  kind: EventKind;
  keywords: string[];
  template: string;
  psakRef: string;
};

const EVENT_RULES: EventRule[] = [
  {
    kind: "SALES_CREDIT",
    keywords: ["penjualan kredit", "faktur penjualan", "invoice penjualan", "nota penjualan", "piutang"],
    template: "T-003",
    psakRef: "PSAK 72",
  },
  {
    kind: "SALES_CASH",
    keywords: ["penjualan tunai", "kas masuk", "penerimaan kas", "kwitansi", "nota"],
    template: "T-001",
    psakRef: "PSAK 72",
  },
  {
    kind: "PURCHASE",
    keywords: ["pembelian", "faktur pembelian", "invoice pembelian", "beli", "persediaan", "stok"],
    template: "T-005",
    psakRef: "PSAK 14",
  },
  {
    kind: "RECEIPT",
    keywords: ["penerimaan piutang", "pelunasan", "setoran", "transfer masuk", "kredit masuk"],
    template: "T-004",
    psakRef: "PSAK 72",
  },
  {
    kind: "PAYMENT",
    keywords: ["pembayaran", "transfer keluar", "pembayaran utang", "debit"],
    template: "T-005",
    psakRef: "PSAK 14",
  },
];

/** Deteksi event dari teks dokumen. Return null jika tidak jelas. */
export function detectBusinessEvent(text: string, docType: string): { kind: EventKind; template: string; psakRef: string; score: number } | null {
  const lower = text.toLowerCase();

  // Skor keyword per rule
  let best: { kind: EventKind; template: string; psakRef: string; score: number } | null = null;
  for (const rule of EVENT_RULES) {
    const hits = rule.keywords.filter((k) => lower.includes(k)).length;
    if (hits === 0) continue;
    const score = hits / rule.keywords.length;
    if (!best || score > best.score) {
      best = { kind: rule.kind, template: rule.template, psakRef: rule.psakRef, score };
    }
  }

  // Prioritas jenis dokumen: invoice → penjualan/pembelian; rekening koran → penerimaan/pembayaran
  if (docType === "BANK_STATEMENT" && best && (best.kind === "RECEIPT" || best.kind === "PAYMENT")) {
    return best;
  }
  if (docType === "INVOICE" && best && (best.kind === "SALES_CREDIT" || best.kind === "SALES_CASH" || best.kind === "PURCHASE")) {
    return best;
  }

  return best;
}

// ── Penyusunan draft jurnal ──────────────────────────────────────────────

const PPN_RATE = 0.11; // PPN 11% (berlaku umum saat ini)

function hasPpn(text: string): boolean {
  return /ppn|pajak pertambahan|pajak keluaran|pajak masukan/i.test(text);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Susun baris jurnal sesuai template (debit/credit selalu balance). */
export function buildTemplateLines(
  event: { kind: EventKind; template: string; psakRef: string },
  amount: number,
  opts: { withPpn: boolean },
): RuleLine[] {
  const { kind, psakRef } = event;
  const ppn = opts.withPpn ? round2(amount * PPN_RATE) : 0;
  const total = round2(amount + ppn);

  switch (kind) {
    case "SALES_CREDIT":
      return [
        { accountCode: "1-1200", accountName: "Piutang Usaha", debit: total, credit: 0, psakRef, notes: opts.withPpn ? "Termasuk PPN 11%" : undefined },
        { accountCode: "4-1000", accountName: "Pendapatan Penjualan", debit: 0, credit: amount, psakRef },
        ...(ppn > 0
          ? [{ accountCode: "2-2000", accountName: "PPN Keluaran", debit: 0, credit: ppn, psakRef, notes: "PPN 11%" }]
          : []),
      ];
    case "SALES_CASH":
      return [
        { accountCode: "1-1000", accountName: "Kas", debit: total, credit: 0, psakRef },
        { accountCode: "4-1000", accountName: "Pendapatan Penjualan", debit: 0, credit: amount, psakRef },
        ...(ppn > 0
          ? [{ accountCode: "2-2000", accountName: "PPN Keluaran", debit: 0, credit: ppn, psakRef, notes: "PPN 11%" }]
          : []),
      ];
    case "PURCHASE":
      return [
        { accountCode: "1-1300", accountName: "Persediaan Barang Dagang", debit: amount, credit: 0, psakRef },
        ...(ppn > 0
          ? [{ accountCode: "1-1400", accountName: "PPN Masukan", debit: ppn, credit: 0, psakRef, notes: "PPN 11%" }]
          : []),
        { accountCode: "2-1100", accountName: "Utang Usaha", debit: 0, credit: total, psakRef },
      ];
    case "RECEIPT":
      return [
        { accountCode: "1-1000", accountName: "Kas", debit: amount, credit: 0, psakRef },
        { accountCode: "1-1200", accountName: "Piutang Usaha", debit: 0, credit: amount, psakRef },
      ];
    case "PAYMENT":
      return [
        { accountCode: "2-1100", accountName: "Utang Usaha", debit: amount, credit: 0, psakRef },
        { accountCode: "1-1000", accountName: "Kas", debit: 0, credit: amount, psakRef },
      ];
  }
}

/**
 * Susun draft jurnal penuh dari teks dokumen.
 * Return DraftResult — exceptionFlag terisi jika tidak bisa diproses andal.
 */
export function buildDraftJournal(
  text: string,
  opts: { industry: string; docType: string },
): DraftResult {
  const event = detectBusinessEvent(text, opts.docType);
  const amount = parseRupiah(text);
  const withPpn = hasPpn(text);

  // Skor keyakinan: event 40%, jumlah 35%, balance/kelengkapan 15%, jenis dokumen 10%
  let confidence = 0;
  if (event) confidence += 0.4 * event.score;
  if (amount) confidence += 0.35;
  if (event && amount) confidence += 0.15;

  const exceptionFlag =
    !event ? "Business event tidak terdeteksi dengan jelas"
    : !amount ? "Jumlah nominal tidak terdeteksi dengan jelas"
    : null;

  const lines: RuleLine[] = [];
  if (event && amount) {
    lines.push(...buildTemplateLines(event, amount, { withPpn }));
  }

  const description =
    event && amount
      ? `${event.template === "T-005" ? "Pembelian" : "Penjualan"} terdeteksi — ${event.kind.replace("_", " ").toLowerCase()}`
      : "Draft tidak lengkap — perlu review manual";

  return {
    description,
    detectedEvent: event?.kind ?? null,
    template: event?.template ?? null,
    lines,
    confidence: round2(Math.min(confidence, 1)),
    exceptionFlag,
  };
}
