import type { ReactNode } from "react";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

const STAGE_TONE: Record<string, StatusTone> = {
  JUNIOR: "warning",
  SENIOR: "accent",
  TAX: "neutral",
  PARTNER: "danger",
};

const STAGE_LABEL: Record<string, string> = {
  JUNIOR: "Review Junior",
  SENIOR: "Review Senior",
  TAX: "Review Pajak",
  PARTNER: "Persetujuan Partner",
};

const STAGE_ORDER = ["JUNIOR", "SENIOR", "TAX", "PARTNER"];

export function stageLabel(stage: string): string {
  return STAGE_LABEL[stage] ?? stage;
}

export function stageBadge(stage: string): ReactNode {
  return <StatusBadge label={stageLabel(stage)} tone={STAGE_TONE[stage] ?? "neutral"} />;
}

export { STAGE_ORDER };
