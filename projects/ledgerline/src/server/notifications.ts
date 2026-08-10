/**
 * EN-05 (F2) — Webhook notification dispatch.
 *
 * Firma mendaftarkan URL webhook per tipe event (journalApproved, slaBreach, dll).
 * Consumer worker memanggil dispatchWebhooks untuk tiap OutboxEvent.
 *
 * Keamanan: setiap webhook request ditandatangani dengan HMAC-SHA256
 * (header X-Praktis-Signature) agar firma bisa memverifikasi pengirim.
 */

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";

type WebhookPayload = {
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
};

/** Buat HMAC-SHA256 signature untuk payload. */
export function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Kirim event ke semua webhook terdaftar yang cocok eventType-nya. */
export async function dispatchWebhooks(
  outboxId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<{ sent: number; failed: number }> {
  const subs = await prisma.webhookSubscription.findMany({
    where: {
      enabled: true,
      eventTypes: { has: eventType },
    },
  });

  if (subs.length === 0) return { sent: 0, failed: 0 };

  const body: WebhookPayload = {
    eventType,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const bodyStr = JSON.stringify(body);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Praktis-Event": eventType,
        "X-Praktis-Delivery": outboxId,
      };

      if (sub.secret) {
        headers["X-Praktis-Signature"] = signPayload(sub.secret, bodyStr);
      }

      const res = await fetch(sub.url, {
        method: "POST",
        headers,
        body: bodyStr,
        signal: AbortSignal.timeout(10_000),
      });

      const resBody = await res.text().catch(() => "");

      await prisma.notificationLog.create({
        data: {
          outboxId,
          webhookId: sub.id,
          status: res.ok ? "SENT" : "FAILED",
          statusCode: res.status,
          response: resBody.slice(0, 2000),
        },
      });

      if (res.ok) {
        sent++;
      } else {
        failed++;
        throw new Error(`Webhook returned ${res.status}: ${resBody.slice(0, 200)}`);
      }
    } catch (err) {
      failed++;
      await prisma.notificationLog.create({
        data: {
          outboxId,
          webhookId: sub.id,
          status: "FAILED",
          error: String(err).slice(0, 2000),
        },
      });
    }
  }

  return { sent, failed };
}
