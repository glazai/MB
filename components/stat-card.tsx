import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "emerald" | "red" | "amber";
}) {
  return (
    <Card className="transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
        </div>
        <p
          className={`font-mono tabular-nums text-2xl font-medium tracking-tight ${
            tone === "emerald"
              ? "text-emerald-600"
              : tone === "red"
                ? "text-red-600"
                : tone === "amber"
                  ? "text-amber-600"
                  : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
