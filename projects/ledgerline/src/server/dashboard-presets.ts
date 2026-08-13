/**
 * Preset layout Dockview per role (EN-07 — fokus dashboard per role).
 * Urutan panel = prioritas: panel pertama mendapat area terbesar.
 */

export type DockPanelDef = {
  id: string;
  component: string;
  title: string;
};

const CATALOG = {
  kpi: { id: "kpi", component: "kpi", title: "KPI Ringkasan" },
  pipeline: { id: "pipeline", component: "pipeline", title: "Pipeline Produksi" },
  sla: { id: "sla", component: "sla", title: "Monitoring SLA" },
  quality: { id: "quality", component: "quality", title: "Insight Kualitas" },
} as const satisfies Record<string, DockPanelDef>;

const ROLE_PRESETS: Record<string, DockPanelDef[]> = {
  JUNIOR: [CATALOG.pipeline, CATALOG.sla, CATALOG.kpi],
  SENIOR: [CATALOG.quality, CATALOG.sla, CATALOG.kpi],
  TAX: [CATALOG.sla, CATALOG.pipeline, CATALOG.quality],
  PARTNER: [CATALOG.kpi, CATALOG.sla, CATALOG.quality],
  ADMIN: [CATALOG.kpi, CATALOG.pipeline, CATALOG.sla, CATALOG.quality],
};

const PRESET_LABEL: Record<string, string> = {
  JUNIOR: "Preset Junior — fokus antrian",
  SENIOR: "Preset Senior — fokus kualitas",
  TAX: "Preset Tax — fokus SLA pajak",
  PARTNER: "Preset Partner — fokus SLA & kualitas",
  ADMIN: "Preset Admin — ringkasan penuh",
};

export function getRolePreset(role: string | null | undefined): DockPanelDef[] {
  return ROLE_PRESETS[role ?? "ADMIN"] ?? ROLE_PRESETS.ADMIN;
}

export function getPresetLabel(role: string | null | undefined): string {
  return PRESET_LABEL[role ?? "ADMIN"] ?? PRESET_LABEL.ADMIN;
}

/** Opsi dropdown preset switcher (urutan tampilan). */
export const PRESET_OPTIONS: { role: string; label: string }[] = [
  { role: "ADMIN", label: PRESET_LABEL.ADMIN },
  { role: "JUNIOR", label: PRESET_LABEL.JUNIOR },
  { role: "SENIOR", label: PRESET_LABEL.SENIOR },
  { role: "TAX", label: PRESET_LABEL.TAX },
  { role: "PARTNER", label: PRESET_LABEL.PARTNER },
];

export function panelIds(defs: DockPanelDef[]): string[] {
  return defs.map((d) => d.id);
}
