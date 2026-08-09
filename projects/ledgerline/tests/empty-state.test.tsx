import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState (TD-13)", () => {
  it("menampilkan judul dan deskripsi", () => {
    render(<EmptyState title="Belum ada dokumen" description="Upload dokumen pertama Anda." />);
    expect(screen.getByText("Belum ada dokumen")).toBeInTheDocument();
    expect(screen.getByText("Upload dokumen pertama Anda.")).toBeInTheDocument();
  });

  it("role status untuk screen reader", () => {
    render(<EmptyState title="Kosong" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("ikon default dan kustom", () => {
    const { rerender } = render(<EmptyState title="A" />);
    expect(screen.getByText("📭")).toBeInTheDocument();
    rerender(<EmptyState title="A" icon="🧾" />);
    expect(screen.getByText("🧾")).toBeInTheDocument();
  });

  it("tidak merender deskripsi saat tidak diberikan", () => {
    render(<EmptyState title="A" />);
    expect(document.querySelector("p")).not.toBeNull();
  });

  it("merender action node", () => {
    render(<EmptyState title="A" action={<button type="button">Unggah</button>} />);
    expect(screen.getByRole("button", { name: "Unggah" })).toBeInTheDocument();
  });
});
