import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard/queues"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

import { QueueList } from "@/components/queues/queue-list";

describe("QueueList", () => {
  it("menampilkan skeleton saat loading", () => {
    window.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    const { container } = render(<QueueList />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("menampilkan error state dengan tombol retry", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Network error" }),
    });
    render(<QueueList />);
    const err = await screen.findByText(/Network error/);
    expect(err).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /coba lagi/i })).toBeInTheDocument();
  });

  it("menampilkan empty state saat tidak ada antrian", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], summary: {}, isAdmin: false }),
    });
    render(<QueueList />);
    const empty = await screen.findByText(/Antrian kosong/);
    expect(empty).toBeInTheDocument();
  });
});
