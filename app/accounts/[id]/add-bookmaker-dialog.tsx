"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { createAccountWithBalance } from "../actions";

const formSchema = z.object({
  bookmakerId: z.string().min(1, "Choose a bookmaker"),
  balance: z
    .union([z.number(), z.nan()])
    .optional()
    .nullable(),
});

type FormValues = z.infer<typeof formSchema>;

type AddBookmakerDialogProps = {
  personId: string;
  bookmakers: { id: string; name: string }[];
};

export function AddBookmakerDialog({ personId, bookmakers }: AddBookmakerDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { bookmakerId: "", balance: undefined },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createAccountWithBalance({
        personId,
        bookmakerId: values.bookmakerId,
        balance: values.balance === null || values.balance === undefined || Number.isNaN(values.balance)
          ? null
          : values.balance,
      });
      toast.success("Bookmaker added");
      setOpen(false);
      reset();
    } catch {
      toast.error("That bookmaker is already added, or something went wrong");
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
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add Bookmaker
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bookmaker</DialogTitle>
        </DialogHeader>
        {bookmakers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every bookmaker has already been added for this person.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bookmakerId">Bookmaker</FieldLabel>
                <Controller
                  control={control}
                  name="bookmakerId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="bookmakerId" className="w-full">
                        <SelectValue placeholder="Select a bookmaker" />
                      </SelectTrigger>
                      <SelectContent>
                        {bookmakers.map((bookmaker) => (
                          <SelectItem key={bookmaker.id} value={bookmaker.id}>
                            {bookmaker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.bookmakerId]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="balance">Starting balance (optional)</FieldLabel>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("balance", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.balance]} />
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isSubmitting}>
                Add
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
