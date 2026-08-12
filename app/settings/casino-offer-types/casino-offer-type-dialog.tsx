"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { createCasinoOfferType, updateCasinoOfferType } from "./actions";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

type FormValues = z.infer<typeof formSchema>;

type CasinoOfferTypeDialogProps = {
  mode: "create" | "edit";
  offerType?: { id: string; name: string };
  trigger: React.ReactNode;
};

export function CasinoOfferTypeDialog({ mode, offerType, trigger }: CasinoOfferTypeDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: offerType?.name ?? "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (mode === "create") {
        await createCasinoOfferType(values);
        toast.success(`Added ${values.name}`);
      } else if (offerType) {
        await updateCasinoOfferType(offerType.id, values);
        toast.success(`Updated ${values.name}`);
      }
      setOpen(false);
      reset();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Offer Type" : "Edit Offer Type"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {mode === "create" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
