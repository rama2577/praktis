"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  pipeline: "Pipeline Produksi",
  queues: "Antrian Review",
  journals: "Jurnal Manual",
  exceptions: "Pengecualian",
  knowledge: "Knowledge Base",
  reports: "Laporan",
  "trial-balance": "Neraca Percobaan",
  ledger: "Buku Besar",
  custom: "Laporan Custom AI",
  financial: "Laporan Keuangan",
  assets: "Aset Tetap",
  tax: "Core Tax",
  recon: "Rekonsiliasi Bank",
  sla: "Monitoring SLA",
  quality: "Metrik Kualitas",
  outbox: "Outbox Event",
  settings: "Pengaturan",
  clients: "Klien",
  "[id]": "Detail Klien",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  // Skip the first "dashboard" from path so breadcrumb starts clean:
  // /dashboard/reports/financial → Dashboard / Laporan / Laporan Keuangan
  const crumbs: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
  ];

  let href = "";
  for (const seg of segments) {
    href += `/${seg}`;
    const label = LABELS[seg] ?? seg;
    if (label === "Dashboard" && crumbs.length === 1) continue;
    crumbs.push({ label, href });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 py-1">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          {i > 0 && (
            <span className="text-slate-700" aria-hidden>
              /
            </span>
          )}
          {i === crumbs.length - 1 ? (
            <span className="text-sm text-slate-700" aria-current="page">
              {c.label}
            </span>
          ) : (
            <Link
              href={c.href}
              className="text-sm text-slate-700 transition hover:text-slate-800"
            >
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
