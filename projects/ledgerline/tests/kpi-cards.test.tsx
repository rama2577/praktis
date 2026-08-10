import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { KpiCards } from "@/components/dashboard/kpi-cards";
import type { DashboardData } from "@/server/dashboard";

const baseData: DashboardData = {
  activeClients: 5,
  newClientsThisMonth: 2,
  aiAutomationPct: 95.5,
  jobsInProgress: 18,
  aiDraftJobs: 9,
  reviewJobs: 9,
  transactionsToday: 22,
  transactionsDeltaPct: 12.3,
  avgDailyTransactions: 15,
  slaBreachCount: 2,
  breachesByStage: [
    { stage: "JUNIOR", count: 1 },
    { stage: "TAX", count: 1 },
  ],
  pipeline: {
    statusCounts: { DRAFT: 8, JUNIOR_REVIEW: 5, SENIOR_REVIEW: 3, TAX_REVIEW: 3, APPROVED: 1, EXCEPTION: 1, REJECTED: 1, ARCHIVED: 0 },
    documentsPending: 0,
    documentsProcessing: 0,
    tasksPending: 12,
  },
  sla: [],
  confidence: [],
  activity: [],
  firstPassRate: 77.3,
  industry: [],
  trend: [],
  insights: [],
};

describe("KpiCards", () => {
  it("menampilkan 6 kartu KPI", () => {
    render(<KpiCards data={baseData} />);
    const cards = screen.getAllByRole("generic").filter(
      el => el.className.includes("rounded-xl") && el.className.includes("border-line")
    );
    expect(cards.length).toBe(6);
  });

  it("menampilkan label & nilai untuk setiap kartu", () => {
    render(<KpiCards data={baseData} />);
    expect(screen.getByText("First-Pass Rate")).toBeInTheDocument();
    expect(screen.getByText("77,3%")).toBeInTheDocument();
    expect(screen.getByText("Klien Aktif")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("AI Automation")).toBeInTheDocument();
    expect(screen.getByText("95,5%")).toBeInTheDocument();
  });

  it("first-pass rate hijau ≥70%", () => {
    render(<KpiCards data={{ ...baseData, firstPassRate: 85 }} />);
    expect(screen.getByText("85%").className).toContain("text-emerald-400");
  });

  it("first-pass rate kuning ≥40%", () => {
    render(<KpiCards data={{ ...baseData, firstPassRate: 50 }} />);
    expect(screen.getByText("50%").className).toContain("text-amber-400");
  });

  it("first-pass rate merah <40%", () => {
    render(<KpiCards data={{ ...baseData, firstPassRate: 30 }} />);
    expect(screen.getByText("30%").className).toContain("text-red-400");
  });

  it("SLA breaches merah jika >0", () => {
    render(<KpiCards data={{ ...baseData, slaBreachCount: 3 }} />);
    expect(screen.getByText("3").className).toContain("text-red-400");
  });

  it("SLA breaches hijau jika 0", () => {
    render(<KpiCards data={{ ...baseData, slaBreachCount: 0, breachesByStage: [] }} />);
    expect(screen.getByText("0").className).toContain("text-emerald-400");
  });

  it("menampilkan hint breach per stage", () => {
    render(<KpiCards data={baseData} />);
    expect(screen.getByText(/Junior 1 · Pajak 1/)).toBeInTheDocument();
  });

  it("menampilkan delta transaksi negatif dengan warna merah", () => {
    const down = { ...baseData, transactionsDeltaPct: -8.5 };
    render(<KpiCards data={down} />);
    const hint = screen.getByText(/-8,5% vs rata-rata harian 15/);
    expect(hint.className).toContain("text-red-400");
  });
});
