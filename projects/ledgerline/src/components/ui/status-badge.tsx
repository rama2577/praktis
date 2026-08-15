export type StatusTone = "positive" | "warning" | "danger" | "neutral" | "accent";

const TONE_CLASSES: Record<StatusTone, string> = {
  positive: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  danger: "bg-red-500/10 text-red-600 border-red-500/30",
  neutral: "bg-slate-500/10 text-slate-700 border-slate-500/30",
  accent: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

export function StatusBadge({
  label,
  tone = "neutral",
  className = "",
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
      />
      {label}
    </span>
  );
}
