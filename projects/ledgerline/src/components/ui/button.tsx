import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * EN-07 — Button: varian konsisten (gold primary, outline secondary, ghost, danger).
 * Aksesibilitas: focus-visible gold outline (global), disabled state jelas.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-slate-900 font-semibold hover:bg-yellow-300 active:bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-400",
  secondary:
    "border border-line bg-card/60 text-slate-200 hover:border-slate-500 hover:bg-card disabled:opacity-50",
  ghost: "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 disabled:opacity-50",
  danger:
    "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
