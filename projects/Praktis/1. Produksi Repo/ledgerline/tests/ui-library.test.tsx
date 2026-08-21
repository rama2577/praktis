import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

describe("Card (EN-07 design system)", () => {
  it("render children", () => {
    render(<Card>konten kartu</Card>);
    expect(screen.getByText("konten kartu")).toBeTruthy();
  });

  it("CardHeader menampilkan judul + deskripsi", () => {
    render(<CardHeader title="Judul" description="Deskripsi" />);
    expect(screen.getByText("Judul")).toBeTruthy();
    expect(screen.getByText("Deskripsi")).toBeTruthy();
  });

  it("CardBody render children", () => {
    render(<CardBody>isi body</CardBody>);
    expect(screen.getByText("isi body")).toBeTruthy();
  });
});

describe("Button (EN-07 design system)", () => {
  it("render label & klik", () => {
    let clicked = false;
    render(<Button onClick={() => (clicked = true)}>Simpan</Button>);
    const btn = screen.getByRole("button", { name: "Simpan" });
    btn.click();
    expect(clicked).toBe(true);
  });

  it("variant primary memakai warna gold (bg-accent)", () => {
    render(<Button variant="primary">Aksi</Button>);
    expect(screen.getByRole("button", { name: "Aksi" }).className).toContain("bg-accent");
  });

  it("variant danger memakai tone merah", () => {
    render(<Button variant="danger">Hapus</Button>);
    expect(screen.getByRole("button", { name: "Hapus" }).className).toContain("red-500");
  });
});

describe("Badge (EN-07 design system)", () => {
  it("Badge alias StatusBadge — tone accent", () => {
    render(<Badge label="AI" tone="accent" />);
    expect(screen.getByText("AI")).toBeTruthy();
  });

  it("StatusBadge tetap tersedia (backward compat)", () => {
    render(<StatusBadge label="OK" tone="positive" />);
    expect(screen.getByText("OK")).toBeTruthy();
  });
});

describe("Table (EN-07 design system)", () => {
  it("render header + baris data", () => {
    render(
      <Table>
        <THead>
          <TH>Clerk</TH>
          <TH className="text-right">SLA</TH>
        </THead>
        <TBody>
          <TR>
            <TD>Budi</TD>
            <TD numeric className="text-right">
              100%
            </TD>
          </TR>
        </TBody>
      </Table>,
    );
    expect(screen.getByText("Clerk")).toBeTruthy();
    expect(screen.getByText("SLA")).toBeTruthy();
    expect(screen.getByText("Budi")).toBeTruthy();
    expect(screen.getByText("100%").className).toContain("tabular-nums");
  });
});
