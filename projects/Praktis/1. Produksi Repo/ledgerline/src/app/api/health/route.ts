import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — healthcheck tanpa auth (untuk load balancer / uptime probe).
 * Mengembalikan status DB & Redis tanpa membocorkan detail internal.
 */
export async function GET() {
  const started = Date.now();
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  let redis = false;
  try {
    const pong = await getRedis().ping();
    redis = pong === "PONG";
  } catch {
    redis = false;
  }

  const ok = db && redis;
  return NextResponse.json(
    {
      ok,
      status: ok ? "healthy" : "degraded",
      uptimeSec: Math.round(process.uptime()),
      db,
      redis,
      latencyMs: Date.now() - started,
    },
    { status: ok ? 200 : 503 },
  );
}
