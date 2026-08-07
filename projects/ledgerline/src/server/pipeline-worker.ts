import { Worker } from "bullmq";
import { processDocument } from "@/server/pipeline";

/**
 * Worker pipeline (proses terpisah dari Next.js).
 * Jalankan: npm run worker
 */
const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

const worker = new Worker(
  "pipeline",
  async (job) => {
    const { documentId } = job.data as { documentId: string };
    const result = await processDocument(documentId);
    if (!result.ok) {
      throw new Error(`${result.reason}${result.message ? `: ${result.message}` : ""}`);
    }
    return result;
  },
  { connection, concurrency: 2 },
);

worker.on("completed", (job) => {
  console.log(`[pipeline] job ${job.id} selesai → ${JSON.stringify(job.returnvalue)}`);
});
worker.on("failed", (job, err) => {
  console.error(`[pipeline] job ${job?.id} gagal: ${err.message}`);
});
worker.on("error", (err) => {
  console.error("[pipeline] worker error:", err.message);
});

console.log("[pipeline] Worker aktif — menunggu dokumen (Redis:", connection.url, ")");
