"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { settleBet } from "./actions";

export function SettleBetButton({
  id,
  event,
  hasExchange,
}: {
  id: string;
  event: string;
  hasExchange: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSettle(outcome: "BOOKMAKER" | "EXCHANGE") {
    startTransition(async () => {
      try {
        await settleBet(id, outcome);
        toast.success("Bet settled");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't settle that bet");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="size-4" />
        Settle
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate">{event}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Which side won?</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSettle("BOOKMAKER")}
            className="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors hover:border-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-500/10"
          >
            <Check className="size-4 text-emerald-600" />
            {hasExchange ? "Bookmaker Won" : "Won"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSettle("EXCHANGE")}
            className="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors hover:border-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
          >
            <X className="size-4 text-red-600" />
            {hasExchange ? "Exchange Won" : "Lost"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
