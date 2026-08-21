import { Worker } from "bullmq";
import { randomUUID } from "node:crypto";
import { processDocument } from "@/server/pipeline";
import { logger } from "@/lib/logger";

/**
 * Worker pipeline (proses terpisah dari Next.js).
 * Jalankan: npm run worker
 */
const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

const worker = new Worker(
  "pipeline",
  async (job) => {
    const { documentId, traceId } = job.data as { documentId: string; traceId?: string };
    const result = await processDocument(documentId, traceId ?? randomUUID());
    if (!result.ok) {
      throw new Error(`${result.reason}${result.message ? `: ${result.message}` : ""}`);
    }
    return result;
  },
  { connection, concurrency: 2 },
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, event: "worker.job_completed", result: job.returnvalue }, "job pipeline selesai");
});
worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, event: "worker.job_failed", error: err.message }, "job pipeline gagal");
});
worker.on("error", (err) => {
  logger.error({ event: "worker.error", error: err.message }, "error worker");
});

logger.info({ event: "worker.started", redis: connection.url }, "Worker aktif — menunggu dokumen");
