import type { ReactNode } from "react";

/**
 * EN-07 — Card: surface panel standar.
 * Pola: `rounded-xl border border-line bg-card/40 p-5` (token design system).
 */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-card p-5 shadow-[0_1px_3px_rgba(31,35,41,0.06)] ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
      <div>
        <h2 className="font-medium text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-700">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
