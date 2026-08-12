"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Scale, Wallet, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { formatDate, formatSignedCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createTransaction, deleteTransaction } from "../actions";

type Transaction = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT" | "BET_SETTLEMENT";
  amount: number;
  date: string;
  notes: string | null;
};

const TYPE_LABEL: Record<Transaction["type"], string> = {
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  ADJUSTMENT: "ADJUSTMENT",
  BET_SETTLEMENT: "BET SETTLEMENT",
};

const formSchema = z.object({
  type: z.enum(["DEPOSIT", "WITHDRAWAL", "ADJUSTMENT"]),
  amount: z.string().min(1, "Enter an amount"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TYPE_OPTIONS = [
  { value: "DEPOSIT" as const, label: "Deposit", icon: ArrowDownToLine },
  { value: "WITHDRAWAL" as const, label: "Withdrawal", icon: ArrowUpFromLine },
  { value: "ADJUSTMENT" as const, label: "Adjustment", icon: Scale },
];

export function TransactionsDialog({
  accountId,
  bookmakerName,
  balance,
  transactions,
}: {
  accountId: string;
  bookmakerName: string;
  balance: number;
  transactions: Transaction[];
}) {
  const [open, setOpen] = useState(false);

  const {
    register,
    control,
    watch,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "DEPOSIT",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const type = watch("type");

  async function onSubmit(values: FormValues) {
    const magnitude = Math.abs(Number(values.amount));
    const amount =
      values.type === "WITHDRAWAL"
        ? -magnitude
        : values.type === "DEPOSIT"
          ? magnitude
          : Number(values.amount);

    try {
      await createTransaction({
        accountId,
        type: values.type,
        amount,
        date: values.date,
        notes: values.notes || null,
      });
      toast.success("Transaction added");
      reset({ type: values.type, amount: "", date: values.date, notes: "" });
    } catch {
      toast.error("Something went wrong adding that transaction");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      toast.success("Transaction deleted");
    } catch {
      toast.error("Couldn't delete that transaction");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Wallet className="size-4" />
        Transactions
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bookmakerName}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 px-3 py-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current balance</span>
          <span className={`font-mono tabular-nums font-semibold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatSignedCurrency(balance)}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    {TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                          field.value === option.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <option.icon className="size-4" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </Field>

            <Field orientation="responsive">
              <Field>
                <FieldLabel htmlFor="amount">
                  {type === "ADJUSTMENT" ? "Adjustment (+/-)" : "Amount"}
                </FieldLabel>
                <Input id="amount" type="number" step="0.01" placeholder="0.00" {...register("amount")} />
                <FieldError errors={[errors.amount]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="date">Date</FieldLabel>
                <Input id="date" type="date" {...register("date")} />
                <FieldError errors={[errors.date]} />
              </Field>
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
              <Input id="notes" placeholder="e.g. Card deposit" {...register("notes")} />
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={isSubmitting} className="mt-3 w-full">
            Add Transaction
          </Button>
        </form>

        <div className="max-h-64 overflow-y-auto -mx-1 px-1">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet.</p>
          ) : (
            <div className="space-y-1">
              {transactions.map((transaction) => {
                const isBetSettlement = transaction.type === "BET_SETTLEMENT";
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex items-start gap-1.5">
                      {isBetSettlement && (
                        <Receipt className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate">
                          {formatDate(transaction.date)}
                          {transaction.notes ? ` — ${transaction.notes}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{TYPE_LABEL[transaction.type]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "font-mono tabular-nums font-medium",
                          transaction.amount >= 0 ? "text-emerald-600" : "text-red-600",
                        )}
                      >
                        {formatSignedCurrency(transaction.amount)}
                      </span>
                      {isBetSettlement ? (
                        <span className="text-xs text-muted-foreground" title="Edit the bet to change this">
                          auto
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(transaction.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
