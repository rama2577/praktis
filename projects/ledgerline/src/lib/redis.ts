import { Redis } from "ioredis";

let client: Redis | null = null;

/** Koneksi Redis singleton (dipakai BullMQ, rate limit, healthcheck). */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    client.on("error", () => {
      /* koneksi ditangani pemanggil; hindari crash loop */
    });
  }
  return client;
}
