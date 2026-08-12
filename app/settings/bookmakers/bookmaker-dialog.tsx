"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { createBookmaker, updateBookmaker } from "./actions";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  isExchange: z.boolean(),
  commissionRate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type BookmakerDialogProps = {
  mode: "create" | "edit";
  bookmaker?: {
    id: string;
    name: string;
    isExchange: boolean;
    commissionRate: number | null;
  };
  trigger: React.ReactNode;
};

export function BookmakerDialog({ mode, bookmaker, trigger }: BookmakerDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: bookmaker?.name ?? "",
      isExchange: bookmaker?.isExchange ?? false,
      commissionRate: bookmaker?.commissionRate?.toString() ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        name: values.name,
        isExchange: values.isExchange,
        commissionRate: values.commissionRate ? Number(values.commissionRate) : null,
      };
      if (mode === "create") {
        await createBookmaker(payload);
        toast.success(`Added ${values.name}`);
      } else if (bookmaker) {
        await updateBookmaker(bookmaker.id, payload);
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
          <DialogTitle>{mode === "create" ? "Add Bookmaker" : "Edit Bookmaker"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field orientation="horizontal">
              <input
                id="isExchange"
                type="checkbox"
                className="h-4 w-4"
                {...register("isExchange")}
              />
              <FieldLabel htmlFor="isExchange">This is an exchange</FieldLabel>
            </Field>
            <Field>
              <FieldLabel htmlFor="commissionRate">Commission rate (%, optional)</FieldLabel>
              <Controller
                control={control}
                name="commissionRate"
                render={({ field }) => (
                  <Input
                    id="commissionRate"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2"
                    {...field}
                  />
                )}
              />
              <FieldError errors={[errors.commissionRate]} />
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
