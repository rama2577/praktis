import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";

/**
 * Infrastruktur ekspor laporan terpusat (PDF + XLSX + CSV).
 * PDF memakai pdfkit (sudah ada), XLSX memakai exceljs (sudah ada).
 * Semua route laporan tinggal memetakan datanya ke `PdfReport` / `SheetDef[]`.
 */

export type PdfColumn = {
  header: string;
  align?: "left" | "right" | "center";
  ratio?: number; // bobot lebar relatif (default 1)
};

export type PdfTable = {
  title?: string;
  columns: PdfColumn[];
  rows: (string | number)[][];
  footer?: string[];
  paragraphs?: string[]; // teks naratif full-width (tanpa kolom)
};

export type PdfReport = {
  title: string;
  subtitle?: string;
  tables: PdfTable[];
};

export type SheetDef = {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, string | number>[];
};

// pdfkit Helvetica (WinAnsi) tidak mendukung emoji/CJK — buang agar tidak jadi karakter rusak.
function safeText(v: string | number): string {
  const s = typeof v === "number" ? v.toLocaleString("id-ID") : String(v ?? "");
  return s.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");
}

// ── XLSX ─────────────────────────────────────────────────────────────────────
export async function xlsxBuffer(sheets: SheetDef[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    ws.columns = s.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
    for (const r of s.rows) ws.addRow(r);
    // Tebalkan header
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── PDF ──────────────────────────────────────────────────────────────────────
const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

export async function renderPdf(report: PdfReport): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  let y = MARGIN;
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#1f2329");
  doc.text(safeText(report.title), MARGIN, y, { align: "center", width: CONTENT_W });
  y += doc.heightOfString(report.title, { width: CONTENT_W }) + 4;

  if (report.subtitle) {
    doc.font("Helvetica").fontSize(10).fillColor("#646a73");
    doc.text(safeText(report.subtitle), MARGIN, y, { align: "center", width: CONTENT_W });
    y += doc.heightOfString(report.subtitle, { width: CONTENT_W }) + 4;
  }

  doc.font("Helvetica").fontSize(8.5).fillColor("#8a93a0");
  const printed = `Dicetak ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;
  doc.text(printed, MARGIN, y, { align: "center", width: CONTENT_W });
  y += 18;
  doc.fillColor("#000");

  for (const table of report.tables) {
    y = drawTable(doc, table, y);
  }

  doc.end();
  return done;
}

function drawTable(doc: InstanceType<typeof PDFDocument>, table: PdfTable, startY: number): number {
  const totalRatio = table.columns.reduce((s, c) => s + (c.ratio ?? 1), 0);
  const colWidths = table.columns.map((c) => (CONTENT_W * (c.ratio ?? 1)) / totalRatio);
  const xs: number[] = [];
  colWidths.forEach((w, i) => xs.push(i === 0 ? MARGIN : xs[i - 1] + w));

  const bottom = PAGE_H - MARGIN;
  let y = startY;

  if (table.title) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#1f2329");
    doc.text(safeText(table.title), MARGIN, y, { width: CONTENT_W });
    y += doc.heightOfString(table.title, { width: CONTENT_W }) + 8;
  }

  // Paragraf naratif (tanpa kolom)
  if (table.paragraphs) {
    doc.font("Helvetica").fontSize(9).fillColor("#2a2f36");
    for (const p of table.paragraphs) {
      const h = doc.heightOfString(safeText(p), { width: CONTENT_W }) + 6;
      if (y + h > bottom) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(safeText(p), MARGIN, y, { width: CONTENT_W });
      y += h;
    }
    y += 4;
  }

  if (table.columns.length === 0) {
    return y + 8;
  }

  const drawHeader = () => {
    const hh = 18;
    if (y + hh > bottom) {
      doc.addPage();
      y = MARGIN;
    }
    doc.rect(MARGIN, y, CONTENT_W, hh).fill("#eef1f7");
    doc.fillColor("#1f2329").font("Helvetica-Bold").fontSize(8);
    table.columns.forEach((c, i) => {
      doc.text(safeText(c.header), xs[i] + 4, y + 5, {
        width: colWidths[i] - 8,
        align: c.align ?? "left",
        lineBreak: false,
      });
    });
    doc.fillColor("#000");
    y += hh;
  };

  drawHeader();
  doc.font("Helvetica").fontSize(8);

  for (const row of table.rows) {
    const cells = row.map((v, i) => {
      const text = safeText(v);
      const align = table.columns[i]?.align ?? (typeof v === "number" ? "right" : "left");
      const h = doc.heightOfString(text, { width: colWidths[i] - 8 });
      return { text, align, h };
    });
    const rh = Math.max(...cells.map((c) => c.h)) + 6;

    if (y + rh > bottom) {
      doc.addPage();
      y = MARGIN;
      drawHeader();
      doc.font("Helvetica").fontSize(8);
    }

    cells.forEach((cell, i) => {
      doc.text(cell.text, xs[i] + 4, y + 3, { width: colWidths[i] - 8, align: cell.align });
    });
    doc.moveTo(MARGIN, y + rh).lineTo(MARGIN + CONTENT_W, y + rh).strokeColor("#e5e6eb").lineWidth(0.5).stroke();
    y += rh;
  }

  if (table.footer) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#1f2329");
    for (const line of table.footer) {
      if (y + 14 > bottom) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(safeText(line), MARGIN, y, { width: CONTENT_W });
      y += 13;
    }
    doc.fillColor("#000");
  }

  return y + 16;
}

// ── Responses ────────────────────────────────────────────────────────────────
export function csvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function xlsxResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function pdfResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
