"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteBetType } from "./actions";

export function DeleteBetTypeButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete ${name}? This fails if bets still reference it.`)) return;
    startTransition(async () => {
      try {
        await deleteBetType(id);
        toast.success(`Deleted ${name}`);
      } catch {
        toast.error(`Couldn't delete ${name} — it's probably still in use.`);
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
      Delete
    </Button>
  );
}
