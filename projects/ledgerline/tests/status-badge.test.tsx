import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/ui/status-badge";

describe("StatusBadge (TD-13)", () => {
  it("menampilkan label", () => {
    render(<StatusBadge label="APPROVED" tone="positive" />);
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
  });

  it("default tone = neutral", () => {
    render(<StatusBadge label="DRAFT" />);
    expect(screen.getByText("DRAFT").className).toContain("border-slate-500/30");
  });

  it("tone positive memakai kelas hijau", () => {
    render(<StatusBadge label="OK" tone="positive" />);
    expect(screen.getByText("OK").className).toContain("bg-emerald-500/10");
  });

  it("menambahkan className custom", () => {
    render(<StatusBadge label="X" className="my-test" />);
    expect(screen.getByText("X").className).toContain("my-test");
  });

  it("indikator dot memiliki aria-hidden", () => {
    render(<StatusBadge label="Y" />);
    expect(document.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
