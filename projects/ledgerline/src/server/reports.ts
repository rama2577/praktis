import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import type { JournalEntry, JournalLine } from "@prisma/client";
import { prisma } from "@/lib/db";

type JournalWithLines = JournalEntry & { lines: JournalLine[] };

/** Ambil jurnal klien (lengkap dengan baris) untuk rentang tanggal. */
export async function getClientJournals(
  clientId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<JournalWithLines[]> {
  return prisma.journalEntry.findMany({
    where: {
      clientId,
      ...(startDate || endDate
        ? { createdAt: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } }
        : {}),
    },
    include: { lines: { orderBy: { debit: "desc" } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  }) as Promise<JournalWithLines[]>;
}

function fmtRupiah(n: number): string {
  return n.toLocaleString("id-ID");
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Generate laporan PDF (neraca saldo + daftar jurnal). */
export async function generateReportPdf(
  journals: JournalWithLines[],
  clientName: string,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const write = (await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Header
    doc.fontSize(16).font("Helvetica-Bold").text("Laporan Jurnal", { align: "center" });
    doc.fontSize(11).font("Helvetica").text(clientName, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(9).text(`Dicetak: ${fmtDate(new Date())} | ${journals.length} jurnal`, { align: "center" });
    doc.moveDown(1);

    // Ringkasan neraca saldo
    const debitTotal = journals.reduce((s, j) => s + j.lines.reduce((a, l) => a + Number(l.debit), 0), 0);
    const creditTotal = journals.reduce((s, j) => s + j.lines.reduce((a, l) => a + Number(l.credit), 0), 0);

    doc.fontSize(11).font("Helvetica-Bold").text("Neraca Saldo", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9).font("Helvetica");
    doc.text(`Total Debit:  Rp ${fmtRupiah(debitTotal)}`, { continued: false });
    doc.text(`Total Kredit: Rp ${fmtRupiah(creditTotal)}`, { continued: false });
    doc.text(`Selisih:     Rp ${fmtRupiah(Math.abs(debitTotal - creditTotal))}`, { continued: false });
    doc.moveDown(1);

    // Daftar jurnal
    doc.fontSize(11).font("Helvetica-Bold").text("Daftar Jurnal", { underline: true });
    doc.moveDown(0.5);

    for (const j of journals) {
      doc.fontSize(8).font("Helvetica-Bold").text(`${fmtDate(j.createdAt)} — ${j.description ?? "Tanpa deskripsi"}`, { continued: false });
      doc.fontSize(7.5).font("Helvetica")
        .text(`Status: ${j.status} | Confidence: ${j.confidence ?? "-"} | Exception: ${j.exceptionFlag ?? "-"}`);
      for (const l of j.lines) {
        doc.text(
          `  ${l.accountCode} ${l.accountName.padEnd(30, " ")}  Debit: ${fmtRupiah(Number(l.debit))}  Kredit: ${fmtRupiah(Number(l.credit))}  PSAK: ${l.psakRef}`,
        );
      }
      doc.moveDown(0.3);
    }

    doc.end();
  }));

  return write;
}

/** Generate laporan CSV (jurnal + baris, comma-separated, UTF-8 BOM). */
export function generateReportCsv(journals: JournalWithLines[]): string {
  const rows: string[] = ["Tanggal,Deskripsi,Status,Confidence,ExceptionFlag,KodeAkun,NamaAkun,Debit,Kredit,PSAK"];
  for (const j of journals) {
    for (const l of j.lines) {
      rows.push(
        [
          j.createdAt.toISOString().slice(0, 10),
          `"${(j.description ?? "").replace(/"/g, '""')}"`,
          j.status,
          j.confidence ?? "",
          `"${(j.exceptionFlag ?? "").replace(/"/g, '""')}"`,
          l.accountCode,
          `"${l.accountName.replace(/"/g, '""')}"`,
          Number(l.debit),
          Number(l.credit),
          l.psakRef,
        ].join(","),
      );
    }
  }
  return "\uFEFF" + rows.join("\n");
}

/** Generate laporan XLSX (sheet Jurnal + sheet Neraca). */
export function generateReportXlsx(journals: JournalWithLines[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(
    journals.flatMap((j) =>
      j.lines.map((l) => ({
        Tanggal: j.createdAt.toISOString().slice(0, 10),
        Deskripsi: j.description ?? "",
        Status: j.status,
        Confidence: j.confidence ?? "",
        Exception: j.exceptionFlag ?? "",
        KodeAkun: l.accountCode,
        NamaAkun: l.accountName,
        Debit: Number(l.debit),
        Kredit: Number(l.credit),
        PSAK: l.psakRef,
      })),
    ),
  );

  const debitTotal = journals.reduce((s, j) => s + j.lines.reduce((a, l) => a + Number(l.debit), 0), 0);
  const creditTotal = journals.reduce((s, j) => s + j.lines.reduce((a, l) => a + Number(l.credit), 0), 0);
  const summary = XLSX.utils.json_to_sheet([
    { Keterangan: "Total Debit", Jumlah: debitTotal },
    { Keterangan: "Total Kredit", Jumlah: creditTotal },
    { Keterangan: "Selisih", Jumlah: Math.abs(debitTotal - creditTotal) },
    { Keterangan: "Jumlah Jurnal", Jumlah: journals.length },
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jurnal");
  XLSX.utils.book_append_sheet(wb, summary, "Neraca");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
