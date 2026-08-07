import pino from "pino";

/**
 * Logger terstruktur (JSON) — event name stabil, level konsisten:
 * error = invariant rusak, warn = degradasi tertangani, info = event bisnis
 * penting, debug = off di produksi. Jangan pernah log secret/PII.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { app: "ledgerline" },
  timestamp: pino.stdTimeFunctions.isoTime,
});
