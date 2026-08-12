"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteBet } from "./actions";

export function DeleteBetButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Delete this bet?")) return;
    startTransition(async () => {
      try {
        await deleteBet(id);
        toast.success("Bet deleted");
        router.refresh();
      } catch {
        toast.error("Couldn't delete that bet");
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
      Delete
    </Button>
  );
}
