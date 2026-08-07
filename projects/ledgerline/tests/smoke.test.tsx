import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { formatCurrencyRp } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

describe("formatCurrencyRp", () => {
  it("memformat ribuan dengan titik", () => {
    expect(formatCurrencyRp(1500000)).toBe("Rp 1.500.000");
  });

  it("menangani nilai nol dan bukan-angka", () => {
    expect(formatCurrencyRp(0)).toBe("Rp 0");
    expect(formatCurrencyRp(Number.NaN)).toBe("Rp 0");
  });

  it("membulatkan nilai desimal", () => {
    expect(formatCurrencyRp(1247.6)).toBe("Rp 1.248");
  });
});

describe("StatusBadge", () => {
  it("menampilkan label dengan tone danger", () => {
    render(<StatusBadge label="SLA Terlampaui" tone="danger" />);
    expect(screen.getByText("SLA Terlampaui")).toBeInTheDocument();
  });
});
