import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * EN-07 — Button: varian konsisten (blue Lark primary, outline secondary, ghost, danger).
 * Aksesibilitas: focus-visible blue outline (global), disabled state jelas.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "ai";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-white font-semibold hover:bg-[#1f49ce] active:bg-[#1a3db0] disabled:bg-slate-200 disabled:text-slate-700",
  secondary:
    "border border-line bg-card text-foreground hover:border-slate-400 hover:bg-hover disabled:opacity-50",
  ghost: "text-muted hover:bg-hover hover:text-foreground disabled:opacity-50",
  danger:
    "border border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 disabled:opacity-50",
  ai:
    "bg-ai text-white font-semibold hover:bg-[#6a3ae0] active:bg-[#5a2ed6] disabled:bg-slate-200 disabled:text-slate-700",
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
