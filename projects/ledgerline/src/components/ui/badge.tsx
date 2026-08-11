import { StatusBadge, type StatusTone } from "./status-badge";

/**
 * EN-07 — Badge: alias StatusBadge dengan nama konsisten design system.
 * Tone: positive | warning | danger | neutral | accent.
 */
export function Badge(props: { label: string; tone?: StatusTone; className?: string }) {
  return <StatusBadge {...props} />;
}

export { StatusBadge, type StatusTone };
