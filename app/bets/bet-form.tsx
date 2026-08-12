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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { calcBackLayOutcomes } from "@/lib/bet-calculator";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { createBet, updateBet, type BetInput } from "./actions";

type Person = { id: string; name: string };
type Account = {
  id: string;
  personId: string;
  bookmaker: { id: string; name: string; isExchange: boolean };
  balance: number;
};
type BetType = { id: string; name: string };

const formSchema = z
  .object({
    personId: z.string().min(1, "Choose a person"),
    accountId: z.string().min(1, "Choose an account"),
    exchangeAccountId: z.string().optional(),
    betTypeId: z.string().min(1, "Choose a bet type"),
    event: z.string().trim().min(1, "Event is required"),
    eventDate: z.string().min(1, "Date is required"),
    bookmakerProfit: z.string().optional(),
    stake: z.string().optional(),
    backStake: z.string().optional(),
    backOdds: z.string().optional(),
    layOdds: z.string().optional(),
    commission: z.string().optional(),
    snr: z.boolean().optional(),
    outcome: z.enum(["BOOKMAKER", "EXCHANGE"]).optional(),
    status: z.enum(["SETTLED", "PENDING", "VOID"]),
    notes: z.string().optional(),
  })
  .refine((data) => Boolean(data.exchangeAccountId) || data.status !== "SETTLED" || !!data.bookmakerProfit, {
    message: "Enter the Profit/Loss to mark this bet settled.",
    path: ["bookmakerProfit"],
  })
  .refine(
    (data) => !data.exchangeAccountId || Boolean(data.backStake && data.backOdds && data.layOdds),
    {
      message: "Enter Back Stake, Back Odds, and Lay Odds.",
      path: ["backStake"],
    },
  )
  .refine((data) => !data.exchangeAccountId || data.status !== "SETTLED" || Boolean(data.outcome), {
    message: "Choose which side won to mark this bet settled.",
    path: ["outcome"],
  });

type FormValues = z.infer<typeof formSchema>;

type BetFormProps = {
  mode: "create" | "edit";
  betId?: string;
  people: Person[];
  accounts: Account[];
  betTypes: BetType[];
  defaultValues?: Partial<FormValues>;
};

function toDateInputValue(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function BetForm({ mode, betId, people, accounts, betTypes, defaultValues }: BetFormProps) {
  const router = useRouter();
  const singlePerson = people.length === 1 ? people[0] : null;

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
      personId: defaultValues?.personId ?? singlePerson?.id ?? "",
      accountId: defaultValues?.accountId ?? "",
      exchangeAccountId: defaultValues?.exchangeAccountId ?? "",
      betTypeId: defaultValues?.betTypeId ?? "",
      event: defaultValues?.event ?? "",
      eventDate: toDateInputValue(defaultValues?.eventDate),
      bookmakerProfit: defaultValues?.bookmakerProfit ?? "",
      stake: defaultValues?.stake ?? "",
      backStake: defaultValues?.backStake ?? "",
      backOdds: defaultValues?.backOdds ?? "",
      layOdds: defaultValues?.layOdds ?? "",
      commission: defaultValues?.commission ?? "",
      snr: defaultValues?.snr ?? false,
      outcome: defaultValues?.outcome ?? undefined,
      status: defaultValues?.status ?? "PENDING",
      notes: defaultValues?.notes ?? "",
    },
  });

  const selectedPersonId = watch("personId");
  const exchangeAccountId = watch("exchangeAccountId");
  const status = watch("status");
  const [backStake, backOdds, layOdds, commission, snr] = watch([
    "backStake",
    "backOdds",
    "layOdds",
    "commission",
    "snr",
  ]);

  const hasExchange = Boolean(exchangeAccountId);

  const accountsForPerson = useMemo(
    () => accounts.filter((account) => account.personId === selectedPersonId),
    [accounts, selectedPersonId],
  );

  const exchangeAccountsForPerson = useMemo(
    () => accountsForPerson.filter((account) => account.bookmaker.isExchange),
    [accountsForPerson],
  );

  const preview = useMemo(() => {
    if (!hasExchange) return null;
    const stake = Number(backStake);
    const bOdds = Number(backOdds);
    const lOdds = Number(layOdds);
    if (!stake || !bOdds || !lOdds || bOdds <= 1 || lOdds <= 1) return null;
    return calcBackLayOutcomes({
      backStake: stake,
      backOdds: bOdds,
      layOdds: lOdds,
      commission: Number(commission) || 0,
      snr: Boolean(snr),
    });
  }, [hasExchange, backStake, backOdds, layOdds, commission, snr]);

  function insufficientBalanceMessage(values: FormValues): string | null {
    const account = accounts.find((a) => a.id === values.accountId);
    if (!account) return null;

    if (values.exchangeAccountId) {
      const backStake = Number(values.backStake);
      const backOdds = Number(values.backOdds);
      const layOdds = Number(values.layOdds);
      if (!backStake || !backOdds || !layOdds) return null;

      if (backStake > account.balance) {
        return `${account.bookmaker.name} balance is ${formatCurrency(account.balance)} — this bet needs ${formatCurrency(backStake)}. Add a deposit first.`;
      }

      const exchangeAccount = accounts.find((a) => a.id === values.exchangeAccountId);
      if (exchangeAccount) {
        const { liability } = calcBackLayOutcomes({
          backStake,
          backOdds,
          layOdds,
          commission: Number(values.commission) || 0,
          snr: values.snr ?? false,
        });
        if (liability > exchangeAccount.balance) {
          return `${exchangeAccount.bookmaker.name} balance is ${formatCurrency(exchangeAccount.balance)} — this bet's liability is ${formatCurrency(liability)}. Add a deposit first.`;
        }
      }
      return null;
    }

    const stake = values.stake ? Number(values.stake) : 0;
    if (stake > 0 && stake > account.balance) {
      return `${account.bookmaker.name} balance is ${formatCurrency(account.balance)} — this bet needs ${formatCurrency(stake)}. Add a deposit first.`;
    }
    return null;
  }

  async function onSubmit(values: FormValues) {
    const shortfall = insufficientBalanceMessage(values);
    if (shortfall) {
      const account = accounts.find((a) => a.id === values.accountId);
      toast.error(shortfall, {
        action: account
          ? {
              label: "Add deposit",
              onClick: () => router.push(`/accounts/${account.personId}`),
            }
          : undefined,
      });
      return;
    }

    const payload: BetInput = {
      accountId: values.accountId,
      exchangeAccountId: values.exchangeAccountId || null,
      betTypeId: values.betTypeId,
      event: values.event,
      eventDate: values.eventDate,
      bookmakerProfit: values.bookmakerProfit ? Number(values.bookmakerProfit) : null,
      stake: values.stake ? Number(values.stake) : null,
      backStake: values.backStake ? Number(values.backStake) : null,
      backOdds: values.backOdds ? Number(values.backOdds) : null,
      layOdds: values.layOdds ? Number(values.layOdds) : null,
      commission: values.commission ? Number(values.commission) : null,
      snr: values.snr ?? false,
      outcome: values.outcome ?? null,
      status: values.status,
      notes: values.notes || null,
    };

    try {
      if (mode === "create") {
        await createBet(payload);
        toast.success("Bet added");
      } else if (betId) {
        await updateBet(betId, payload);
        toast.success("Bet updated");
      }
      router.push("/sports");
      router.refresh();
    } catch {
      toast.error("Something went wrong saving that bet");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
      <Card>
        <CardContent>
          <FieldGroup>
            {(() => {
              const accountField = (
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
                      This person has no accounts yet — add one on the Accounts page first.
                    </p>
                  )}
                </Field>
              );

              if (singlePerson) return accountField;

              return (
                <Field orientation="responsive" className="@md/field-group:items-start">
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
                            setValue("exchangeAccountId", "");
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

                  {accountField}
                </Field>
              );
            })()}

            <Field orientation="responsive" className="@md/field-group:items-start">
              <Field>
                <FieldLabel htmlFor="exchangeAccountId">Exchange account (optional)</FieldLabel>
                <Controller
                  control={control}
                  name="exchangeAccountId"
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                      disabled={!selectedPersonId}
                    >
                      <SelectTrigger id="exchangeAccountId" className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {exchangeAccountsForPerson.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bookmaker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="betTypeId">Bet type</FieldLabel>
                <Controller
                  control={control}
                  name="betTypeId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="betTypeId" className="w-full">
                        <SelectValue placeholder="Select a bet type" />
                      </SelectTrigger>
                      <SelectContent>
                        {betTypes.map((betType) => (
                          <SelectItem key={betType.id} value={betType.id}>
                            {betType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.betTypeId]} />
              </Field>
            </Field>

            <Field orientation="responsive" className="@md/field-group:items-start">
              <Field>
                <FieldLabel htmlFor="event">Event</FieldLabel>
                <Input id="event" placeholder="e.g. Arsenal vs Chelsea" {...register("event")} />
                <FieldError errors={[errors.event]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="eventDate">Date</FieldLabel>
                <Input id="eventDate" type="date" {...register("eventDate")} />
                <FieldError errors={[errors.eventDate]} />
              </Field>
            </Field>

            {hasExchange ? (
              <>
                <Field orientation="responsive" className="@md/field-group:items-start">
                  <Field>
                    <FieldLabel htmlFor="backStake">Back stake</FieldLabel>
                    <Input id="backStake" type="number" step="0.01" placeholder="10.00" {...register("backStake")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="backOdds">Back odds</FieldLabel>
                    <Input id="backOdds" type="number" step="0.01" placeholder="2.00" {...register("backOdds")} />
                  </Field>
                </Field>
                <Field orientation="responsive" className="@md/field-group:items-start">
                  <Field>
                    <FieldLabel htmlFor="layOdds">Lay odds</FieldLabel>
                    <Input id="layOdds" type="number" step="0.01" placeholder="1.87" {...register("layOdds")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="commission">Exchange commission %</FieldLabel>
                    <Input id="commission" type="number" step="0.01" placeholder="0" {...register("commission")} />
                  </Field>
                </Field>
                <FieldError errors={[errors.backStake]} />
                <Field orientation="horizontal">
                  <Controller
                    control={control}
                    name="snr"
                    render={({ field }) => (
                      <Checkbox
                        id="snr"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    )}
                  />
                  <FieldLabel htmlFor="snr" className="font-normal">
                    Stake not returned (free bet)
                  </FieldLabel>
                </Field>

                {preview && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lay stake</span>
                      <span className="font-medium">£{preview.layStake.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Liability</span>
                      <span className="font-medium">£{preview.liability.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">If bookmaker wins</span>
                      <span className="font-medium">
                        {formatSignedCurrency(preview.ifBookmakerWins.bookmakerProfit + preview.ifBookmakerWins.exchangeProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">If exchange wins</span>
                      <span className="font-medium">
                        {formatSignedCurrency(preview.ifExchangeWins.bookmakerProfit + preview.ifExchangeWins.exchangeProfit)}
                      </span>
                    </div>
                  </div>
                )}

                {status === "SETTLED" && (
                  <Field>
                    <FieldLabel htmlFor="outcome">Which side won?</FieldLabel>
                    <Controller
                      control={control}
                      name="outcome"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger id="outcome" className="w-full">
                            <SelectValue placeholder="Select the outcome" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BOOKMAKER">Bookmaker won</SelectItem>
                            <SelectItem value="EXCHANGE">Exchange won</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[errors.outcome]} />
                  </Field>
                )}
              </>
            ) : (
              <Field orientation="responsive" className="@md/field-group:items-start">
                <Field>
                  <FieldLabel htmlFor="stake">Stake (optional)</FieldLabel>
                  <Input id="stake" type="number" step="0.01" placeholder="10.00" {...register("stake")} />
                  <p className="text-sm text-muted-foreground">
                    Lets this bet's stake count toward Exposure while it's still Pending.
                  </p>
                </Field>
                <Field>
                  <FieldLabel htmlFor="bookmakerProfit">Profit / Loss</FieldLabel>
                  <Input
                    id="bookmakerProfit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("bookmakerProfit")}
                  />
                  <FieldError errors={[errors.bookmakerProfit]} />
                </Field>
              </Field>
            )}

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
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="SETTLED">Settled</SelectItem>
                      <SelectItem value="VOID">Void</SelectItem>
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
              {mode === "create" ? "Add Bet" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/sports")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
