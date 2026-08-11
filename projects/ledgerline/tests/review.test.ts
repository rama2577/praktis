import { describe, expect, it } from "vitest";
import {
  batchApproveTasks,
  BATCH_APPROVE_CONFIDENCE_MIN,
  canTransition,
  JOURNAL_TRANSITIONS,
  nextStatusForAction,
  reviewStageForStatus,
  selectBatchApprovable,
} from "@/server/journal-machine";
import { computeFinalSlaStatus, computeSlaStatus, SLA_TARGETS_MIN } from "@/server/sla";

describe("state machine transisi jurnal", () => {
  it("alur utama DRAFT → … → APPROVED valid", () => {
    expect(canTransition("DRAFT", "JUNIOR_REVIEW")).toBe(true);
    expect(canTransition("JUNIOR_REVIEW", "SENIOR_REVIEW")).toBe(true);
    expect(canTransition("SENIOR_REVIEW", "TAX_REVIEW")).toBe(true);
    expect(canTransition("TAX_REVIEW", "PARTNER_APPROVAL")).toBe(true);
    expect(canTransition("PARTNER_APPROVAL", "APPROVED")).toBe(true);
  });

  it("lompatan stage ditolak (tidak ada shortcut)", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
    expect(canTransition("JUNIOR_REVIEW", "APPROVED")).toBe(false);
    expect(canTransition("SENIOR_REVIEW", "APPROVED")).toBe(false);
    expect(canTransition("TAX_REVIEW", "APPROVED")).toBe(false);
    expect(canTransition("DRAFT", "TAX_REVIEW")).toBe(false);
  });

  it("aksi return ke stage sebelumnya valid", () => {
    expect(canTransition("JUNIOR_REVIEW", "DRAFT")).toBe(true);
    expect(canTransition("SENIOR_REVIEW", "JUNIOR_REVIEW")).toBe(true);
    expect(canTransition("TAX_REVIEW", "SENIOR_REVIEW")).toBe(true);
    expect(canTransition("PARTNER_APPROVAL", "TAX_REVIEW")).toBe(true);
  });

  it("reject dari semua stage review valid; reject dari DRAFT/APPROVED tidak", () => {
    for (const s of ["JUNIOR_REVIEW", "SENIOR_REVIEW", "TAX_REVIEW", "PARTNER_APPROVAL", "EXCEPTION"]) {
      expect(canTransition(s as keyof typeof JOURNAL_TRANSITIONS, "REJECTED")).toBe(true);
    }
    expect(canTransition("DRAFT", "REJECTED")).toBe(false);
    expect(canTransition("APPROVED", "REJECTED")).toBe(false);
  });

  it("EXCEPTION hanya bisa kembali ke JUNIOR_REVIEW / REJECTED / ARCHIVED", () => {
    expect(canTransition("EXCEPTION", "JUNIOR_REVIEW")).toBe(true);
    expect(canTransition("EXCEPTION", "APPROVED")).toBe(false);
    expect(canTransition("EXCEPTION", "TAX_REVIEW")).toBe(false);
  });

  it("APPROVED hanya bisa diarsipkan", () => {
    expect(canTransition("APPROVED", "ARCHIVED")).toBe(true);
    expect(canTransition("APPROVED", "JUNIOR_REVIEW")).toBe(false);
  });

  it("setiap status punya entri transisi yang tercantum di tabel", () => {
    const all = Object.keys(JOURNAL_TRANSITIONS);
    expect(all).toEqual(expect.arrayContaining(["DRAFT", "JUNIOR_REVIEW", "SENIOR_REVIEW", "TAX_REVIEW", "PARTNER_APPROVAL", "APPROVED", "EXCEPTION", "REJECTED", "ARCHIVED"]));
  });
});

describe("pemetaan status → stage review", () => {
  it("memetakan 4 status review ke stage", () => {
    expect(reviewStageForStatus("JUNIOR_REVIEW")).toBe("JUNIOR");
    expect(reviewStageForStatus("SENIOR_REVIEW")).toBe("SENIOR");
    expect(reviewStageForStatus("TAX_REVIEW")).toBe("TAX");
    expect(reviewStageForStatus("PARTNER_APPROVAL")).toBe("PARTNER");
  });

  it("status non-review tidak punya stage", () => {
    for (const s of ["DRAFT", "APPROVED", "REJECTED", "EXCEPTION", "ARCHIVED"]) {
      expect(reviewStageForStatus(s as Parameters<typeof reviewStageForStatus>[0])).toBeNull();
    }
  });
});

describe("status tujuan per aksi review", () => {
  it("approve maju satu stage", () => {
    expect(nextStatusForAction("JUNIOR", "approve")).toBe("SENIOR_REVIEW");
    expect(nextStatusForAction("SENIOR", "approve")).toBe("TAX_REVIEW");
    expect(nextStatusForAction("TAX", "approve")).toBe("PARTNER_APPROVAL");
    expect(nextStatusForAction("PARTNER", "approve")).toBe("APPROVED");
  });

  it("reject selalu REJECTED", () => {
    for (const s of ["JUNIOR", "SENIOR", "TAX", "PARTNER"] as const) {
      expect(nextStatusForAction(s, "reject")).toBe("REJECTED");
    }
  });

  it("return mundur satu stage", () => {
    expect(nextStatusForAction("JUNIOR", "return")).toBe("DRAFT");
    expect(nextStatusForAction("SENIOR", "return")).toBe("JUNIOR_REVIEW");
    expect(nextStatusForAction("TAX", "return")).toBe("SENIOR_REVIEW");
    expect(nextStatusForAction("PARTNER", "return")).toBe("TAX_REVIEW");
  });
});

describe("EN-06 — batch approve (confidence gate)", () => {
  it("ambang default 85%", () => {
    expect(BATCH_APPROVE_CONFIDENCE_MIN).toBe(0.85);
  });

  it("hanya confidence ≥ ambang yang layak disetujui", () => {
    const tasks = [
      { id: "a", confidence: 0.9 },
      { id: "b", confidence: 0.84 },
      { id: "c", confidence: 0.85 },
      { id: "d", confidence: null },
    ];
    const { approvable, skipped } = selectBatchApprovable(tasks, 0.85);
    expect(approvable).toEqual(["a", "c"]);
    expect(skipped).toEqual(["b", "d"]);
  });

  it("ambang 0 → semua (termasuk confidence rendah) layak", () => {
    const tasks = [{ id: "x", confidence: 0.1 }];
    const { approvable, skipped } = selectBatchApprovable(tasks, 0);
    expect(approvable).toEqual(["x"]);
    expect(skipped).toEqual([]);
  });

  it("list kosong → tidak ada yang layak/skip", () => {
    const { approvable, skipped } = selectBatchApprovable([], 0.85);
    expect(approvable).toEqual([]);
    expect(skipped).toEqual([]);
  });

  it("batchApproveTasks terdefinisi (orchestrasi via state machine)", () => {
    expect(typeof batchApproveTasks).toBe("function");
  });
});

describe("SLA computation", () => {
  it("target per stage terdefinisi dan positif", () => {
    for (const v of Object.values(SLA_TARGETS_MIN)) {
      expect(v).toBeGreaterThan(0);
    }
    expect(SLA_TARGETS_MIN.JUNIOR).toBeLessThanOrEqual(SLA_TARGETS_MIN.SENIOR);
  });

  it("MET jika ≤ target; AT_RISK hingga 125%; BREACHED setelahnya", () => {
    const target = 120;
    expect(computeSlaStatus(60, target)).toBe("MET");
    expect(computeSlaStatus(120, target)).toBe("MET");
    expect(computeSlaStatus(130, target)).toBe("AT_RISK");
    expect(computeSlaStatus(150, target)).toBe("AT_RISK");
    expect(computeSlaStatus(151, target)).toBe("BREACHED");
    expect(computeSlaStatus(240, target)).toBe("BREACHED");
  });

  it("SLA final: MET hanya jika ≤ target", () => {
    expect(computeFinalSlaStatus(119, 120)).toBe("MET");
    expect(computeFinalSlaStatus(120, 120)).toBe("MET");
    expect(computeFinalSlaStatus(121, 120)).toBe("BREACHED");
  });
});
