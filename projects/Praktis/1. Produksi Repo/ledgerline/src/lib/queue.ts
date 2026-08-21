import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

export const pipelineQueue = new Queue("pipeline", { connection });

/**
 * Enqueue dokumen ke pipeline worker (BullMQ + Redis).
 * `traceId` dibuat di sini dan mengalir ke worker → pipeline → log (korelasi).
 */
export async function enqueueDocumentProcessing(documentId: string, firmId: string) {
  const traceId = randomUUID();
  await pipelineQueue.add(
    "process-document",
    { documentId, firmId, traceId },
    { attempts: 2, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 1000 },
  );
  await prisma.activityLog.create({
    data: {
      firmId,
      action: "PIPELINE_ENQUEUED",
      detail: { documentId, traceId },
    },
  });
  logger.info({ documentId, firmId, traceId, event: "pipeline.enqueued" }, "dokumen masuk antrian pipeline");
}
