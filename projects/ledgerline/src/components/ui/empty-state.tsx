import type { ReactNode } from "react";

/** Empty state bermakna — ikon + judul + deskripsi + aksi opsional. */
export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center"
    >
      <span aria-hidden className="text-3xl opacity-80">
        {icon}
      </span>
      <p className="mt-3 font-medium text-slate-200">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
