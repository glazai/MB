"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAccountStatus } from "./actions";
import { accountStatusTone } from "@/components/status-badge";

const STATUS_OPTIONS = ["ACTIVE", "RESTRICTED", "GUBBED", "CLOSED"] as const;

const DOT_COLOR: Record<string, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  slate: "bg-slate-400",
};

export function AccountStatusSelect({
  accountId,
  status,
}: {
  accountId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      try {
        await updateAccountStatus(accountId, value as (typeof STATUS_OPTIONS)[number]);
        toast.success("Status updated");
      } catch {
        toast.error("Couldn't update status");
      }
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-36">
        <span className={`size-1.5 rounded-full shrink-0 ${DOT_COLOR[accountStatusTone(status)]}`} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            <span className={`size-1.5 rounded-full shrink-0 ${DOT_COLOR[accountStatusTone(option)]}`} />
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
