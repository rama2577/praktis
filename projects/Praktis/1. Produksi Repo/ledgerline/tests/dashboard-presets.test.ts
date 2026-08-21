import { describe, expect, it } from "vitest";
import { getPresetLabel, getRolePreset, PRESET_OPTIONS, panelIds } from "@/server/dashboard-presets";

describe("dashboard-presets (layout Dockview per role)", () => {
  it("ADMIN: 4 panel, KPI paling prioritas", () => {
    expect(panelIds(getRolePreset("ADMIN"))).toEqual(["kpi", "pipeline", "sla", "quality"]);
  });

  it("JUNIOR: fokus pipeline (antrian) lebih dulu", () => {
    expect(panelIds(getRolePreset("JUNIOR"))[0]).toBe("pipeline");
    expect(panelIds(getRolePreset("JUNIOR"))).toContain("sla");
  });

  it("SENIOR: fokus kualitas lebih dulu", () => {
    expect(panelIds(getRolePreset("SENIOR"))[0]).toBe("quality");
  });

  it("PARTNER: KPI + SLA + kualitas, tanpa pipeline", () => {
    expect(panelIds(getRolePreset("PARTNER"))).toEqual(["kpi", "sla", "quality"]);
  });

  it("TAX: SLA pajak paling prioritas", () => {
    expect(panelIds(getRolePreset("TAX"))[0]).toBe("sla");
  });

  it("role tidak dikenal → fallback ADMIN", () => {
    expect(panelIds(getRolePreset("CEO"))).toEqual(panelIds(getRolePreset("ADMIN")));
    expect(panelIds(getRolePreset(null))).toEqual(panelIds(getRolePreset("ADMIN")));
    expect(panelIds(getRolePreset(undefined))).toEqual(panelIds(getRolePreset("ADMIN")));
  });

  it("semua preset valid & unik id-nya", () => {
    for (const role of ["ADMIN", "JUNIOR", "SENIOR", "TAX", "PARTNER"]) {
      const defs = getRolePreset(role);
      const ids = panelIds(defs);
      expect(new Set(ids).size).toBe(ids.length);
      for (const d of defs) {
        expect(d.component).toBe(d.id);
        expect(d.title.length).toBeGreaterThan(3);
      }
    }
  });

  it("label preset tersedia untuk semua role", () => {
    for (const role of ["ADMIN", "JUNIOR", "SENIOR", "TAX", "PARTNER"]) {
      expect(getPresetLabel(role).length).toBeGreaterThan(5);
    }
    expect(getPresetLabel("UNKNOWN")).toBe(getPresetLabel("ADMIN"));
  });

  it("PRESET_OPTIONS: 5 opsi dropdown, role valid & label unik", () => {
    expect(PRESET_OPTIONS).toHaveLength(5);
    const roles = PRESET_OPTIONS.map((o) => o.role);
    expect(roles).toEqual(["ADMIN", "JUNIOR", "SENIOR", "TAX", "PARTNER"]);
    const labels = new Set(PRESET_OPTIONS.map((o) => o.label));
    expect(labels.size).toBe(5);
    for (const o of PRESET_OPTIONS) {
      expect(getRolePreset(o.role).length).toBeGreaterThan(0);
    }
  });
});
