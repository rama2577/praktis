"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import type { Role } from "@prisma/client";

export function DashboardShell({
  userName,
  userRole,
  today,
  children,
}: {
  userName: string;
  userRole: Role;
  today: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Skip link — terlihat saat fokus keyboard */}
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0b1120] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Lewati ke konten utama
      </a>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          aria-hidden
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* Sidebar: drawer di mobile, statis di desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 -translate-x-full transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : ""
        }`}
      >
        <Sidebar userName={userName} userRole={userRole} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-card/40 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu navigasi"
              className="rounded-lg border border-line p-1.5 text-slate-300 hover:bg-white/5 lg:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h2 className="truncate text-sm font-medium text-slate-300">Operations Dashboard</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="hidden sm:inline">{today}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-400">
              <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              AI Online
            </span>
          </div>
        </header>
        <div className="border-b border-line bg-card/20 px-4 py-1.5 sm:px-6">
          <Breadcrumb />
        </div>
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
