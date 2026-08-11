import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parseDocument } from "@/ai/parsers";
import { draftJournalFromText } from "@/ai/drafting";
import { validateDraftLines } from "@/ai/validation";
import { getClientProfile, coaMappingHint } from "@/server/client-profile";
import { isReferenceDocType } from "@/ai/doc-type-map";
import type { JournalStatus } from "@prisma/client";

/**
 * Proses satu dokumen melalui pipeline:
 * PROCESSING → parse → draft (rule engine / LLM) → validasi → simpan jurnal
 * DRAFT (atau EXCEPTION) → PROCESSED.
 * `traceId` mengalir di semua log untuk korelasi satu dokumen.
 */
export async function processDocument(documentId: string, traceId?: string) {
  const trace = traceId ?? documentId;
  const started = Date.now();
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { client: true },
  });

  if (!doc) return { ok: false as const, reason: "not_found" };

  logger.info({ traceId: trace, documentId, event: "pipeline.start" }, "pipeline mulai memproses dokumen");

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING" },
  });
  await logActivity(doc.firmId, "PIPELINE_STARTED", { documentId, traceId: trace });

  let text: string;
  try {
    text = await parseDocument(doc);
  } catch (e) {
    const reason = (e as Error).message.slice(0, 300);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    });
    await logActivity(doc.firmId, "PIPELINE_FAILED", { documentId, traceId: trace, reason });
    logger.error(
      { traceId: trace, documentId, event: "pipeline.parse_error", reason, durationMs: Date.now() - started },
      "parse dokumen gagal",
    );
    return { ok: false as const, reason: "parse_error", message: reason };
  }

  // F6C — dokumen referensi (legalitas/org-chart/artikel KB): tidak membuat jurnal.
  // Teks hasil ekstraksi disimpan sebagai pengetahuan klien (referenceText).
  if (isReferenceDocType(doc.type)) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PROCESSED", referenceText: text.slice(0, 50_000) },
    });
    await logActivity(doc.firmId, "PIPELINE_REFERENCE_INDEXED", {
      documentId,
      traceId: trace,
      docType: doc.type,
      chars: text.length,
    });
    logger.info(
      { traceId: trace, documentId, docType: doc.type, chars: text.length, event: "pipeline.reference_indexed" },
      "dokumen referensi diindeks (tanpa jurnal)",
    );
    return { ok: true as const, status: "PROCESSED" as const, reference: true };
  }

  const draft = await draftJournalFromText({
    text,
    industry: doc.client.industry,
    docType: doc.type,
    // EN-02: klien dengan ClientProfile READY → drafting pakai mapping COA klien
    coaMappingHint: coaMappingHint(await getClientProfile(doc.clientId)),
  });
  const validation = validateDraftLines(draft.lines);

  const isException = !draft.detectedEvent || !validation.ok || Boolean(draft.exceptionFlag);
  const status: JournalStatus = isException ? "EXCEPTION" : "DRAFT";

  const journal = await prisma.journalEntry.create({
    data: {
      firmId: doc.firmId,
      clientId: doc.clientId,
      documentId: doc.id,
      status,
      confidence: draft.confidence,
      description: draft.description,
      exceptionFlag: draft.exceptionFlag ?? null,
      createdByAi: true,
      lines: {
        create: draft.lines.map((l) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          debit: l.debit,
          credit: l.credit,
          psakRef: l.psakRef,
        })),
      },
    },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PROCESSED" },
  });

  await logActivity(doc.firmId, "AI_DRAFT_COMPLETED", {
    documentId,
    journalId: journal.id,
    status,
    confidence: draft.confidence,
    traceId: trace,
  });

  if (status === "EXCEPTION") {
    await logActivity(doc.firmId, "EXCEPTION_FLAGGED", {
      documentId,
      journalId: journal.id,
      reason: draft.exceptionFlag ?? "Event tidak terdeteksi",
      traceId: trace,
    });
  }

  logger.info(
    { traceId: trace, documentId, journalId: journal.id, status, confidence: draft.confidence, durationMs: Date.now() - started, event: "pipeline.done" },
    "pipeline selesai",
  );

  return { ok: true as const, journalId: journal.id, status, confidence: draft.confidence };
}

async function logActivity(firmId: string, action: string, detail: Record<string, unknown>) {
  await prisma.activityLog.create({ data: { firmId, action, detail: detail as object } });
}
