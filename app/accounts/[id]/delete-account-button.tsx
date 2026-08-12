"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "../actions";

export function DeleteAccountButton({ id, bookmakerName }: { id: string; bookmakerName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`Remove the ${bookmakerName} account? This fails if bets or offers still reference it.`))
      return;
    startTransition(async () => {
      try {
        await deleteAccount(id);
        toast.success(`Removed ${bookmakerName}`);
        router.refresh();
      } catch {
        toast.error(`Couldn't remove ${bookmakerName} — it's probably still in use.`);
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
      Remove
    </Button>
  );
}
