/**
 * EN-05 (F2) — Outbox persistence & consumer.
 *
 * Setiap event domain (journalApproved, journalException, slaBreach)
 * ditulis ke tabel OutboxEvent untuk menjamin at-least-once delivery.
 *
 * Consumer (`processOutbox`) dibaca oleh worker terpisah, mendispatch
 * webhook ke firm-subscribed endpoint, lalu emit in-process.
 */

import { prisma } from "@/lib/db";
import { emit, type PraktisEvents } from "@/lib/events";
import { dispatchWebhooks } from "@/server/notifications";

/** Tulis event ke outbox + emit in-process. */
export async function enqueueOutbox<K extends keyof PraktisEvents>(
  eventType: K,
  payload: PraktisEvents[K],
): Promise<void> {
  // Emit in-process dulu (untuk listener real-time)
  emit(eventType, payload);

  // Simpan ke outbox untuk persistence
  await prisma.outboxEvent.create({
    data: {
      eventType: eventType as string,
      payload: payload as Record<string, unknown>,
    },
  });
}

/** Hitung delay retry eksponensial: 1m, 2m, 4m, 8m... */
function retryDelay(retryCount: number): Date {
  const ms = Math.min(2 ** retryCount * 60_000, 30 * 60_000); // cap 30 menit
  return new Date(Date.now() + ms);
}

/**
 * Proses semua event PENDING yang sudah lewat processAfter.
 * Return jumlah event yang diproses.
 */
export async function processOutbox(): Promise<{ processed: number; failed: number }> {
  const events = await prisma.outboxEvent.findMany({
    where: {
      status: "PENDING",
      processAfter: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      // 1. Dispatch webhook ke semua subscriber
      await dispatchWebhooks(
        event.id,
        event.eventType,
        event.payload as Record<string, unknown>,
      );

      // 2. Emit in-process (listener real-time)
      emit(
        event.eventType as keyof PraktisEvents,
        event.payload as Record<string, unknown> as never,
      );

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      processed++;
    } catch (err) {
      const nextRetry = event.retryCount + 1;
      const final = nextRetry >= event.maxRetries;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          retryCount: nextRetry,
          lastError: String(err),
          processAfter: final ? undefined : retryDelay(nextRetry),
          ...(final ? { status: "FAILED" } : {}),
        },
      });
      failed++;
    }
  }

  return { processed, failed };
}
