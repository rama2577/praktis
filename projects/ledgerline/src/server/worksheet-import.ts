/**
 * Import Kertas Kerja Excel (pola akuntan senior Indonesia).
 * Mendeteksi sheet "Akun" (COA + saldo awal) dan "Jurnal" (jurnal umum),
 * dengan auto-deteksi kolom agar tahan variasi export (Mekari, Accurate, dll).
 */
import ExcelJS from "exceljs";

export type ImportCoaRow = {
  code: string;
  name: string;
  posSaldo: "Db" | "Cr" | "";
  posLaporan: string; // "NRC" | "LR" | ""
  openingDebit: number;
  openingCredit: number;
};

export type ImportJournalLine = { code: string; name: string; debit: number; credit: number; subledgerCode?: string };

export type ImportJournal = {
  date: string; // YYYY-MM-DD
  bukti: string;
  keterangan: string;
  lines: ImportJournalLine[];
  balanced: boolean;
  totalDebit: number;
  totalCredit: number;
};

export type WorksheetParseResult = {
  clientName: string;
  year: number | null;
  coa: ImportCoaRow[];
  journals: ImportJournal[];
  subledgerCodes: { code: string; name: string; group: string; openingBalance: number }[];
  warnings: string[];
  stats: {
    coaCount: number;
    journalGroups: number;
    journalLines: number;
    totalDebit: number;
    totalCredit: number;
    unbalancedGroups: number;
    unknownAccountLines: number;
    openingBalanceAccounts: number;
  };
};

const ROUND = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;


function getRows(ws: ExcelJS.Worksheet): ExcelJS.Row[] {
  const rows: ExcelJS.Row[] = [];
  ws.eachRow((row) => rows.push(row));
  return rows;
}


function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const o = v as { result?: unknown; richText?: { text: string }[] };
  if (typeof o.result === "string" && o.result) return o.result.trim();
  if (Array.isArray(o.richText)) return o.richText.map((t) => t.text).join("").trim();
  return String(v).trim();
}

function detectHeaderRow(rows: ExcelJS.Row[], keywords: string[]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const vals = rows[i]!.values as unknown[];
    const text = vals.map((v) => String(v ?? "")).join(" ").toLowerCase();
    if (keywords.every((k) => text.includes(k.toLowerCase()))) return i;
  }
  return -1;
}

function colIndex(row: ExcelJS.Row, label: string): number {
  const vals = row.values as unknown[];
  const l = label.toLowerCase();
  for (let i = 0; i < vals.length; i++) {
    if (cellText(vals[i]).toLowerCase().includes(l)) return i;
  }
  return -1;
}

function num(v: unknown): number {
  if (typeof v === "number") return ROUND(v);
  // Excel export sering menyimpan angka sebagai formula: { formula: "SUM(...)", result: 123 }
  if (v && typeof v === "object") {
    const o = v as { result?: unknown };
    if (typeof o.result === "number") return ROUND(o.result);
    if (typeof o.result === "string") v = o.result;
    else return 0;
  }
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : ROUND(n);
  }
  return 0;
}

function parseCoa(ws: ExcelJS.Worksheet): { coa: ImportCoaRow[]; warnings: string[]; clientName: string } {
  const rows = getRows(ws);
  const h = detectHeaderRow(rows, ["kode", "nama akun"]);
  const warnings: string[] = [];
  if (h < 0) return { coa: [], warnings: ["Sheet Akun: header 'Kode'/'Nama Akun' tidak ditemukan"], clientName: "" };
  const hr = rows[h]!;
  const hvals = hr.values as unknown[];
  const cCode = colIndex(hr, "kode");
  const cName = colIndex(hr, "nama akun");
  const cPos = colIndex(hr, "pos");
  // "Pos Laporan" sering terbelah 2 baris ("Pos" di baris header, "Laporan" di baris sub-header).
  let cLap = colIndex(hr, "laporan");
  if (cLap < 0 && h + 1 < rows.length) cLap = colIndex(rows[h + 1]!, "laporan");
  // Saldo awal: header sering 2 baris — baris h berisi "Saldo Awal", baris h+1 berisi "Debet"/"Kredit".
  const subVals = h + 1 < rows.length ? (rows[h + 1]!.values as unknown[]) : [];
  let cOpenD = -1;
  let cOpenK = -1;
  for (let i = 0; i < hvals.length; i++) {
    const t = cellText(hvals[i]).toLowerCase();
    if (t.includes("saldo awal")) {
      const st = cellText(subVals[i]).toLowerCase();
      if (st.includes("debet") || st.includes("debit")) cOpenD = i;
      else if (st.includes("kredit")) cOpenK = i;
      else if (cOpenD < 0) cOpenD = i;
      else if (cOpenK < 0) cOpenK = i;
    }
  }
  if (cOpenD < 0 && cOpenK >= 0) cOpenD = cOpenK + 1;
  if (cOpenK < 0 && cOpenD >= 0) cOpenK = cOpenD + 1;

  const coa: ImportCoaRow[] = [];
  let clientName = "";
  const skipWords = ["daftar", "tahun", "kode", "akun", "neraca", "laba", "laporan"];
  for (let i = 0; i < Math.min(rows.length, 3); i++) {
    const vals = rows[i]!.values as unknown[] | undefined;
    if (!vals) continue;
    let found = "";
    for (const v of vals) {
      const t = cellText(v);
      if (t.length > 3) { found = t; break; }
    }
    if (found && !skipWords.some((w) => found.toLowerCase().includes(w))) {
      clientName = found;
      break;
    }
  }

  for (let i = h + 1; i < rows.length; i++) {
    const vals = rows[i]!.values as unknown[];
    const code = cellText(vals[cCode]);
    const name = cellText(vals[cName]);
    if (!code || !name || /^kode$/i.test(code)) continue;
    const posRaw = cellText(vals[cPos]).toLowerCase();
    const posSaldo = posRaw.startsWith("cr") ? "Cr" : posRaw.startsWith("db") ? "Db" : "";
    let d = cOpenD >= 0 ? num(vals[cOpenD]) : 0;
    let k = cOpenK >= 0 ? num(vals[cOpenK]) : 0;
    // Normalisasi tanda: export sering menaruh nilai kredit sebagai negatif di kolom Debet.
    if (d < 0) { k += -d; d = 0; }
    if (k < 0) { d += -k; k = 0; }
    // Lewati baris grup (header sub-kelompok): tanpa pos saldo, tanpa saldo, nama kapital.
    if (!posSaldo && d === 0 && k === 0 && name === name.toUpperCase()) continue;
    coa.push({
      code,
      name,
      posSaldo,
      posLaporan: cellText(vals[cLap]).toUpperCase(),
      openingDebit: d,
      openingCredit: k,
    });
  }

  // Validasi normal balance saldo awal (export sering menukar D/K)
  const classOf = (code: string) => code.trim().charAt(0);
  const isContra = (name: string) => /acc\.?\s*dep|akumulasi|accumulated/i.test(name);
  for (const a of coa) {
    if (a.openingDebit === 0 && a.openingCredit === 0) continue;
    const cls = classOf(a.code);
    if (["1", "5", "6", "8"].includes(cls) && a.openingCredit > 0 && a.openingDebit === 0 && !isContra(a.name)) {
      warnings.push(`Saldo awal ${a.code} ${a.name} (${a.openingCredit}) tampak di kolom Kredit — normalnya Debet; periksa sebelum import.`);
    }
    if (["2", "3", "4", "7", "9"].includes(cls) && a.openingDebit > 0 && a.openingCredit === 0) {
      warnings.push(`Saldo awal ${a.code} ${a.name} (${a.openingDebit}) tampak di kolom Debet — normalnya Kredit; periksa sebelum import.`);
    }
  }
  return { coa, warnings, clientName };
}

function parseJournals(ws: ExcelJS.Worksheet): { journals: ImportJournal[]; warnings: string[]; stats: { lines: number; debit: number; credit: number; unbalanced: number; unknown: number } } {
  const rows = getRows(ws);
  const h = detectHeaderRow(rows, ["tanggal", "bukti", "debet"]);
  const warnings: string[] = [];
  if (h < 0) return { journals: [], warnings: ["Sheet Jurnal: header 'Tanggal'/'Bukti'/'Debet' tidak ditemukan"], stats: { lines: 0, debit: 0, credit: 0, unbalanced: 0, unknown: 0 } };
  const hr = rows[h]!;
  const cDate = colIndex(hr, "tanggal");
  const cBukti = colIndex(hr, "bukti");
  const cKet = colIndex(hr, "keterangan");
  const cCode = colIndex(hr, "kode");
  const cName = colIndex(hr, "nama akun");
  const cDebit = colIndex(hr, "debet");
  const cCredit = colIndex(hr, "kredit");
  const cBantu = colIndex(hr, "bantu");

  type Raw = { date: string; bukti: string; ket: string; code: string; name: string; debit: number; credit: number; bantu: string };
  const raws: Raw[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const vals = rows[i]!.values as unknown[];
    const dateV = vals[cDate];
    if (dateV === null || dateV === undefined) continue;
    const d = num(vals[cDebit]);
    const k = num(vals[cCredit]);
    const code = cellText(vals[cCode]);
    const name = cellText(vals[cName]);
    const bukti = cellText(vals[cBukti]);
    const ket = cellText(vals[cKet]);
    const bantu = cBantu >= 0 ? cellText(vals[cBantu]) : "";
    // Skip baris sampah/footer (tanpa identitas apa pun, mis. baris TOTAL D=K).
    if (!code && !name && !bukti && !ket) continue;
    // Tanggal wajib ada; jika sel berupa teks tanggal, konversi.
    let date = "";
    if (dateV instanceof Date) date = dateV.toISOString().slice(0, 10);
    else {
      const t = cellText(dateV);
      const m = t.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (m) date = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      else {
        const dt = new Date(t);
        if (!isNaN(dt.getTime())) date = dt.toISOString().slice(0, 10);
      }
    }
    if (!date) continue;
    raws.push({ date, bukti, ket, code, name, debit: d, credit: k, bantu });
  }

  const balanceOf = (items: Raw[]) => {
    const d = ROUND(items.reduce((s, r) => s + r.debit, 0));
    const k = ROUND(items.reduce((s, r) => s + r.credit, 0));
    return { d, k, balanced: d === k };
  };

  const makeJournal = (items: Raw[], bukti: string, ket: string): ImportJournal => {
    const { d, k } = balanceOf(items);
    return {
      date: items[0]!.date,
      bukti,
      keterangan: ket,
      lines: items.map((r) => ({ code: r.code, name: r.name, debit: r.debit, credit: r.credit, subledgerCode: r.bantu || undefined })),
      balanced: true,
      totalDebit: d,
      totalCredit: k,
    };
  };

  const journals: ImportJournal[] = [];
  let unbalanced = 0;

  // Level 1: grup per (tanggal + bukti) — jurnal utuh yang balance.
  const byBukti = new Map<string, Raw[]>();
  for (const r of raws) {
    const key = r.bukti ? `${r.date}|${r.bukti}` : `${r.date}|ket:${r.ket}`;
    if (!byBukti.has(key)) byBukti.set(key, []);
    byBukti.get(key)!.push(r);
  }
  const rest: Raw[] = [];
  for (const [key, items] of byBukti) {
    const { balanced } = balanceOf(items);
    if (balanced) {
      const [, b] = key.split("|");
      journals.push(makeJournal(items, b, items[0]!.ket));
    } else {
      rest.push(...items);
    }
  }

  // Level 2: sisa dikelompokkan per tanggal; yang balance jadi 1 jurnal agregat harian.
  const byDate = new Map<string, Raw[]>();
  for (const r of rest) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }
  const rest2: Raw[] = [];
  for (const [date, items] of byDate) {
    const { balanced } = balanceOf(items);
    if (balanced) {
      journals.push(makeJournal(items, "", `Agregat ${date} (kertas kerja tidak balance per transaksi)`));
    } else {
      rest2.push(...items);
    }
  }

  // Level 3: sisa dikelompokkan per bulan; balance → 1 jurnal agregat bulanan.
  const byMonth = new Map<string, Raw[]>();
  for (const r of rest2) {
    const m = r.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(r);
  }
  let skipped = 0;
  for (const [month, items] of byMonth) {
    const { balanced, d, k } = balanceOf(items);
    if (balanced) {
      journals.push(makeJournal(items, "", `Agregat ${month} (kertas kerja)`));
      warnings.push(`Jurnal ${month}: dikelompokkan sebagai agregat bulanan (D ${d} = K ${k}) karena transaksi tidak balance per bukti.`);
    } else {
      skipped++;
      unbalanced++;
      warnings.push(`Jurnal ${month} tidak balance (D ${d} vs K ${k}) — dilewati dari import.`);
    }
  }
  if (unbalanced > 0) warnings.push(`${unbalanced} grup jurnal tidak balance dan dilewati.`);

  return {
    journals,
    warnings,
    stats: {
      lines: raws.length,
      debit: ROUND(raws.reduce((s, r) => s + r.debit, 0)),
      credit: ROUND(raws.reduce((s, r) => s + r.credit, 0)),
      unbalanced,
      unknown: raws.filter((r) => !r.code).length,
    },
  };
}

function parseSubledger(ws: ExcelJS.Worksheet | undefined): { code: string; name: string; group: string; openingBalance: number }[] {
  if (!ws) return [];
  const rows = getRows(ws);
  const h = detectHeaderRow(rows, ["kode", "status", "saldo awal"]);
  if (h < 0) return [];
  const hr = rows[h]!;
  const cCode = colIndex(hr, "kode");
  const cName = colIndex(hr, "piutang") >= 0 ? colIndex(hr, "piutang") : colIndex(hr, "hutang");
  const cGroup = colIndex(hr, "status");
  const cSaldo = colIndex(hr, "saldo awal");
  const out: { code: string; name: string; group: string; openingBalance: number }[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const vals = rows[i]!.values as unknown[];
    const code = cellText(vals[cCode]);
    const name = cellText(vals[cName]);
    if (!code || !name || !/^[A-Z0-9]{2}-\d+$/.test(code)) continue;
    out.push({ code, name, group: cellText(vals[cGroup]), openingBalance: cSaldo >= 0 ? num(vals[cSaldo]) : 0 });
  }
  return out;
}

export async function parseWorksheet(buffer: Uint8Array): Promise<WorksheetParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

  const warnings: string[] = [];
  const coaSheet = wb.worksheets.find((w) => /^akun$/i.test(w.name)) ?? wb.worksheets.find((w) => /akun/i.test(w.name) && !/lajur/i.test(w.name));
  const jurnalSheet = wb.worksheets.find((w) => /^jurnal$/i.test(w.name)) ?? wb.worksheets.find((w) => /jurnal/i.test(w.name));
  const kodeSheet = wb.worksheets.find((w) => /^kode$/i.test(w.name));

  if (!coaSheet) warnings.push("Sheet 'Akun' tidak ditemukan — COA tidak bisa diimpor.");
  if (!jurnalSheet) warnings.push("Sheet 'Jurnal' tidak ditemukan — jurnal tidak bisa diimpor.");

  const coaRes = coaSheet ? parseCoa(coaSheet) : { coa: [] as ImportCoaRow[], warnings: [] as string[], clientName: "" };
  const jrRes = jurnalSheet ? parseJournals(jurnalSheet) : { journals: [] as ImportJournal[], warnings: [] as string[], stats: { lines: 0, debit: 0, credit: 0, unbalanced: 0, unknown: 0 } };
  const subledger = kodeSheet ? parseSubledger(kodeSheet) : [];

  // Deteksi tahun dari baris-baris awal sheet mana pun ("Tahun : 20xx").
  let year: number | null = null;
  for (const ws of wb.worksheets) {
    for (const addr of ["A1", "A2", "A3", "A4", "B2", "B3"]) {
      const t = cellText(ws.getCell(addr).value);
      const m = t.match(/20\d\d/);
      if (m) { year = parseInt(m[0], 10); break; }
    }
    if (year) break;
  }

  const coaCodes = new Set(coaRes.coa.map((c) => c.code));
  const unknownAccountLines = jrRes.journals.reduce((s, j) => s + j.lines.filter((l) => l.code && !coaCodes.has(l.code)).length, 0);
  if (unknownAccountLines > 0) warnings.push(`${unknownAccountLines} baris jurnal memakai kode akun yang tidak ada di COA — nama akun tetap diimpor.`);

  const openingAccounts = coaRes.coa.filter((c) => c.openingDebit !== 0 || c.openingCredit !== 0).length;

  return {
    clientName: coaRes.clientName || "Klien Import",
    year,
    coa: coaRes.coa,
    journals: jrRes.journals,
    subledgerCodes: subledger,
    warnings: [...coaRes.warnings, ...jrRes.warnings, ...warnings],
    stats: {
      coaCount: coaRes.coa.length,
      journalGroups: jrRes.journals.length,
      journalLines: jrRes.stats.lines,
      totalDebit: jrRes.stats.debit,
      totalCredit: jrRes.stats.credit,
      unbalancedGroups: jrRes.stats.unbalanced,
      unknownAccountLines,
      openingBalanceAccounts: openingAccounts,
    },
  };
}

/** Saldo awal per akun → jurnal opening balance (1 line per akun, 1 Jan tahun berjalan). */
export function buildOpeningJournals(coa: ImportCoaRow[], year: number): ImportJournal[] {
  const journals: ImportJournal[] = [];
  const withBalance = coa.filter((c) => c.openingDebit !== 0 || c.openingCredit !== 0);
  for (const a of withBalance) {
    journals.push({
      date: `${year}-01-01`,
      bukti: "OPENING",
      keterangan: `Opening balance ${a.code} ${a.name}`,
      lines: [{ code: a.code, name: a.name, debit: a.openingDebit, credit: a.openingCredit }],
      balanced: true,
      totalDebit: a.openingDebit,
      totalCredit: a.openingCredit,
    });
  }
  return journals;
}
