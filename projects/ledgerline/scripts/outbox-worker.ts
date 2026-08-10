/**
 * EN-05 — Outbox consumer worker.
 *
 * Loop: poll OutboxEvent PENDING, dispatch webhook, update status.
 * Jalankan: `npx tsx scripts/outbox-worker.ts`
 *
 * Di produksi, worker ini berjalan sebagai sidecar/service terpisah
 * (mis. dalam container/pod yang sama dengan app server, atau sebagai
 *  cron job tiap 30 detik).
 */

import { processOutbox } from "../src/server/outbox";

const POLL_MS = 15_000; // 15 detik
let running = true;

process.on("SIGINT", () => {
  console.log("[outbox-worker] shutting down...");
  running = false;
});
process.on("SIGTERM", () => {
  running = false;
});

async function main() {
  console.log("[outbox-worker] started (poll interval: %ds)", POLL_MS / 1000);

  while (running) {
    try {
      const result = await processOutbox();
      if (result.processed > 0 || result.failed > 0) {
        console.log(
          "[outbox-worker] tick: processed=%d failed=%d",
          result.processed,
          result.failed,
        );
      }
    } catch (err) {
      console.error("[outbox-worker] error:", err);
    }

    // Sleep with graceful shutdown support
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, POLL_MS);
      const cleanup = () => {
        clearTimeout(timer);
        resolve();
      };
      process.once("SIGINT", cleanup);
      process.once("SIGTERM", cleanup);
      // Remove listeners if normal sleep completes
      setTimeout(() => {
        process.removeListener("SIGINT", cleanup);
        process.removeListener("SIGTERM", cleanup);
      }, POLL_MS);
    });
  }

  console.log("[outbox-worker] stopped");
  process.exit(0);
}

void main();
