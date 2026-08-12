"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePerson } from "./actions";

export function DeletePersonButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Remove ${name}? This only works if they have no accounts yet.`)) return;
    startTransition(async () => {
      try {
        await deletePerson(id);
        toast.success(`Removed ${name}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Couldn't remove ${name}`);
      }
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={isPending} aria-label={`Remove ${name}`}>
      <X className="size-4" />
    </Button>
  );
}
