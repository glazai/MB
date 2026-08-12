"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { createCasinoOffer, updateCasinoOffer, type CasinoOfferInput } from "./actions";

type Person = { id: string; name: string };
type Account = {
  id: string;
  personId: string;
  bookmaker: { id: string; name: string };
};
type OfferType = { id: string; name: string };

const formSchema = z.object({
  personId: z.string().min(1, "Choose a person"),
  accountId: z.string().min(1, "Choose an account"),
  offerTypeId: z.string().min(1, "Choose an offer type"),
  title: z.string().trim().min(1, "Title is required"),
  offerDate: z.string().min(1, "Date is required"),
  profit: z.string().min(1, "Enter an amount"),
  status: z.enum(["COMPLETED", "IN_PROGRESS", "FORFEITED"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type CasinoOfferFormProps = {
  mode: "create" | "edit";
  offerId?: string;
  people: Person[];
  accounts: Account[];
  offerTypes: OfferType[];
  defaultValues?: Partial<FormValues>;
};

function toDateInputValue(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function CasinoOfferForm({
  mode,
  offerId,
  people,
  accounts,
  offerTypes,
  defaultValues,
}: CasinoOfferFormProps) {
  const router = useRouter();

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personId: defaultValues?.personId ?? "",
      accountId: defaultValues?.accountId ?? "",
      offerTypeId: defaultValues?.offerTypeId ?? "",
      title: defaultValues?.title ?? "",
      offerDate: toDateInputValue(defaultValues?.offerDate),
      profit: defaultValues?.profit ?? "",
      status: defaultValues?.status ?? "COMPLETED",
      notes: defaultValues?.notes ?? "",
    },
  });

  const selectedPersonId = watch("personId");

  const accountsForPerson = useMemo(
    () => accounts.filter((account) => account.personId === selectedPersonId),
    [accounts, selectedPersonId],
  );

  async function onSubmit(values: FormValues) {
    const payload: CasinoOfferInput = {
      accountId: values.accountId,
      offerTypeId: values.offerTypeId,
      title: values.title,
      offerDate: values.offerDate,
      profit: Number(values.profit),
      status: values.status,
      notes: values.notes || null,
    };

    try {
      if (mode === "create") {
        await createCasinoOffer(payload);
        toast.success("Offer added");
      } else if (offerId) {
        await updateCasinoOffer(offerId, payload);
        toast.success("Offer updated");
      }
      router.push("/casino");
      router.refresh();
    } catch {
      toast.error("Something went wrong saving that offer");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl">
      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="personId">Person</FieldLabel>
              <Controller
                control={control}
                name="personId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue("accountId", "");
                    }}
                  >
                    <SelectTrigger id="personId" className="w-full">
                      <SelectValue placeholder="Select a person" />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.personId]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="accountId">Account (bookmaker)</FieldLabel>
              <Controller
                control={control}
                name="accountId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!selectedPersonId}>
                    <SelectTrigger id="accountId" className="w-full">
                      <SelectValue
                        placeholder={selectedPersonId ? "Select an account" : "Choose a person first"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {accountsForPerson.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bookmaker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.accountId]} />
              {selectedPersonId && accountsForPerson.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  This person has no accounts yet — add one on the Account page first.
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="offerTypeId">Offer type</FieldLabel>
              <Controller
                control={control}
                name="offerTypeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="offerTypeId" className="w-full">
                      <SelectValue placeholder="Select an offer type" />
                    </SelectTrigger>
                    <SelectContent>
                      {offerTypes.map((offerType) => (
                        <SelectItem key={offerType.id} value={offerType.id}>
                          {offerType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.offerTypeId]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" placeholder="e.g. 50 Free Spins on Book of Dead" {...register("title")} />
              <FieldError errors={[errors.title]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="offerDate">Date</FieldLabel>
              <Input id="offerDate" type="date" {...register("offerDate")} />
              <FieldError errors={[errors.offerDate]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="profit">Profit / value</FieldLabel>
              <Input id="profit" type="number" step="0.01" placeholder="0.00" {...register("profit")} />
              <FieldError errors={[errors.profit]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                      <SelectItem value="FORFEITED">Forfeited</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
              <Textarea id="notes" rows={3} {...register("notes")} />
            </Field>
          </FieldGroup>

          <div className="mt-6 flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {mode === "create" ? <Plus className="size-4" /> : <Save className="size-4" />}
              {mode === "create" ? "Add Offer" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/casino")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
