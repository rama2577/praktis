"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@prisma/client";

type NavItem = {
  label: string;
  href: string;
  ready: boolean;
  task?: string;
};

const NAV_GROUPS: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "Operasional",
    items: [
      { label: "Dashboard", href: "/dashboard", ready: true },
      { label: "Pipeline Produksi", href: "/dashboard/pipeline", ready: false, task: "Task 9" },
      { label: "Antrian Review", href: "/dashboard/queues", ready: true },
      { label: "Jurnal Manual", href: "/dashboard/journals", ready: true },
      { label: "Pengecualian", href: "/dashboard/exceptions", ready: true },
      { label: "Knowledge Base", href: "/dashboard/knowledge", ready: true },
    ],
  },
  {
    group: "Analitik",
    items: [
      { label: "Metrik Kualitas", href: "/dashboard/quality", ready: true },
      { label: "Neraca Percobaan", href: "/dashboard/reports/trial-balance", ready: true },
      { label: "Buku Besar", href: "/dashboard/reports/ledger", ready: true },
      { label: "Aset Tetap", href: "/dashboard/assets", ready: true },
      { label: "Monitoring SLA", href: "/dashboard/sla", ready: false, task: "Task 10" },
    ],
  },
  {
    group: "Sistem",
    items: [
      { label: "Klien", href: "/dashboard/clients", ready: true },
      { label: "Outbox Event", href: "/dashboard/outbox", ready: false, task: "F2" },
      { label: "Pengaturan", href: "/dashboard/settings", ready: false, task: "Task 8" },
    ],
  },
];

export function Sidebar({
  userName,
  userRole,
  onNavigate,
}: {
  userName: string;
  userRole: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-card/60">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-bold text-[#0b1120]">
          LL
        </div>
        <div>
          <p className="font-heading text-sm font-semibold leading-tight">Praktis</p>
          <p className="text-[11px] text-slate-400">AI Bookkeeping</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi utama">
        {NAV_GROUPS.map(({ group, items }) => (
          <div key={group} className="mb-5">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group}
            </p>
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const active = pathname === item.href;
                if (!item.ready) {
                  return (
                    <li key={item.href}>
                      <span
                        title={`Modul ini hadir di ${item.task}`}
                        className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-500 opacity-60"
                      >
                        {item.label}
                        <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-slate-500">
                          {item.task}
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm transition ${
                        active
                          ? "bg-accent/15 font-medium text-accent"
                          : "text-slate-300 hover:bg-white/5 hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Security badge strip ── */}
      <div className="border-t border-line px-4 py-2.5">
        <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500">
          <span title="Enkripsi AES-256-GCM">🔒 AES-256</span>
          <span className="text-slate-600">·</span>
          <span title="Transport Layer Security">🔐 TLS 1.3</span>
          <span className="text-slate-600">·</span>
          <span title="ISO 27001 ready">🛡️ SOC2-ready</span>
        </div>
      </div>

      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
            {userName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-[11px] text-slate-400">
              {ROLE_LABELS[userRole]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Keluar"
            className="rounded-lg border border-line px-2 py-1 text-xs text-slate-400 transition hover:border-red-500/40 hover:text-red-400"
          >
            Keluar
          </button>
        </div>
      </div>
    </aside>
  );
}
