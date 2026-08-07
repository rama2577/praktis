import { prisma } from "@/lib/db";

/**
 * Antrean pipeline dokumen.
 *
 * Task 5: placeholder — mencatat enqueue ke ActivityLog; Document dibiarkan
 * berstatus PENDING (menunggu worker). Task 6 menggantikan implementasi ini
 * dengan BullMQ + Redis (worker OCR → draft jurnal).
 */
export async function enqueueDocumentProcessing(documentId: string, firmId: string) {
  await prisma.activityLog.create({
    data: {
      firmId,
      action: "PIPELINE_ENQUEUED",
      detail: { documentId },
    },
  });
}
