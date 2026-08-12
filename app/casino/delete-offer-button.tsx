"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCasinoOffer } from "./actions";

export function DeleteOfferButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Delete this offer?")) return;
    startTransition(async () => {
      try {
        await deleteCasinoOffer(id);
        toast.success("Offer deleted");
        router.refresh();
      } catch {
        toast.error("Couldn't delete that offer");
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
      Delete
    </Button>
  );
}
