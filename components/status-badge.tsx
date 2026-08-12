import { cn } from "@/lib/utils";

const TONES = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
} as const;

export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function betStatusTone(status: string): keyof typeof TONES {
  if (status === "SETTLED") return "emerald";
  if (status === "PENDING") return "amber";
  return "slate";
}

export function accountStatusTone(status: string): keyof typeof TONES {
  if (status === "ACTIVE") return "emerald";
  if (status === "RESTRICTED") return "amber";
  if (status === "GUBBED") return "red";
  return "slate";
}

export function casinoOfferStatusTone(status: string): keyof typeof TONES {
  if (status === "COMPLETED") return "emerald";
  if (status === "IN_PROGRESS") return "amber";
  return "red";
}

export function casinoOfferStatusLabel(status: string): string {
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS") return "In progress";
  return "Forfeited";
}
