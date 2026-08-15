import type { HTMLAttributes, ReactNode } from "react";

/**
 * EN-07 — Table primitives: styling konsisten untuk data tabular.
 * - Header: uppercase, tracking, muted.
 * - Angka: font-mono (tabular) agar sejajar.
 * - Row hover subtle; zebra opsional.
 */

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line text-xs uppercase tracking-wider text-slate-700">
        {children}
      </tr>
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-800/70">{children}</tbody>;
}

export function TR({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`transition hover:bg-slate-100 ${className}`} {...rest}>
      {children}
    </tr>
  );
}

export function TH({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 font-medium ${className}`}>{children}</th>;
}

export function TD({
  children,
  numeric = false,
  className = "",
}: {
  children: ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <td className={`px-3 py-2.5 ${numeric ? "font-mono tabular-nums" : ""} ${className}`}>
      {children}
    </td>
  );
}
