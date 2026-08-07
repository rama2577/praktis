import { prisma } from "@/lib/db";
import { parseDocument } from "@/ai/parsers";
import { draftJournalFromText } from "@/ai/drafting";
import { validateDraftLines } from "@/ai/validation";
import type { JournalStatus } from "@prisma/client";

/**
 * Proses satu dokumen melalui pipeline:
 * PROCESSING → parse → draft (rule engine / LLM) → validasi → simpan jurnal
 * DRAFT (atau EXCEPTION) → PROCESSED.
 */
export async function processDocument(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { client: true },
  });

  if (!doc) return { ok: false as const, reason: "not_found" };

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING" },
  });
  await logActivity(doc.firmId, "PIPELINE_STARTED", { documentId });

  let text: string;
  try {
    text = await parseDocument(doc);
  } catch (e) {
    const reason = (e as Error).message.slice(0, 300);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    });
    await logActivity(doc.firmId, "PIPELINE_FAILED", { documentId, reason });
    return { ok: false as const, reason: "parse_error", message: reason };
  }

  const draft = await draftJournalFromText({
    text,
    industry: doc.client.industry,
    docType: doc.type,
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
      exceptionFlag: draft.exceptionFlag ?? (isException ? "Perlu review manual" : null),
      createdByAi: true,
      lines: {
        create: draft.lines.map((l) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          debit: l.debit,
          credit: l.credit,
          psakRef: l.psakRef,
          notes: l.notes,
        })),
      },
    },
  });

  await logActivity(doc.firmId, isException ? "EXCEPTION_FLAGGED" : "AI_DRAFT_COMPLETED", {
    documentId,
    journalId: journal.id,
    confidence: draft.confidence,
    exceptionFlag: draft.exceptionFlag,
    validationErrors: validation.ok ? undefined : validation.errors,
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PROCESSED" },
  });

  return { ok: true as const, journalId: journal.id, status, confidence: draft.confidence };
}

async function logActivity(firmId: string, action: string, detail: Record<string, unknown>) {
  await prisma.activityLog.create({
    data: { firmId, action, detail: detail as object },
  });
}
