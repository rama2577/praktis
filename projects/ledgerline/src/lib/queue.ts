import { Queue } from "bullmq";
import { prisma } from "@/lib/db";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

export const pipelineQueue = new Queue("pipeline", { connection });

/**
 * Enqueue dokumen ke pipeline worker (BullMQ + Redis).
 * Dipanggil dari POST /api/documents setelah record tersimpan.
 */
export async function enqueueDocumentProcessing(documentId: string, firmId: string) {
  await pipelineQueue.add(
    "process-document",
    { documentId, firmId },
    { attempts: 2, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 1000 },
  );
  await prisma.activityLog.create({
    data: {
      firmId,
      action: "PIPELINE_ENQUEUED",
      detail: { documentId },
    },
  });
}
