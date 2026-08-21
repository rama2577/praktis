import type { ReviewStage, SlaStatus } from "@prisma/client";

/** Target SLA per stage review (menit) — dari mockup & knowledge base. */
export const SLA_TARGETS_MIN: Record<ReviewStage, number> = {
  JUNIOR: 120, // 2 jam
  SENIOR: 240, // 4 jam
  TAX: 240, // 4 jam
  PARTNER: 120, // 2 jam
};

/**
 * Status SLA live: MET (≤ target), AT_RISK (target–125%), BREACHED (> 125%).
 */
export function computeSlaStatus(actualMinutes: number, targetMinutes: number): SlaStatus {
  if (actualMinutes <= targetMinutes) return "MET";
  if (actualMinutes <= targetMinutes * 1.25) return "AT_RISK";
  return "BREACHED";
}

/**
 * Status SLA final saat task diselesaikan: MET bila ≤ target, selain itu BREACHED.
 */
export function computeFinalSlaStatus(actualMinutes: number, targetMinutes: number): SlaStatus {
  return actualMinutes <= targetMinutes ? "MET" : "BREACHED";
}
