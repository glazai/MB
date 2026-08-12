"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Check, CheckCircle2, Plus, Trophy, Users, X, Landmark, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createPerson, deletePerson, createAccountWithBalance } from "@/app/accounts/actions";
import { createBookmaker } from "@/app/settings/bookmakers/actions";

type Person = { id: string; name: string };
type Bookmaker = { id: string; name: string; isExchange: boolean };
type BetType = { id: string; name: string };
type AccountPair = { personId: string; bookmakerId: string };

type Step = "people" | "accounts" | "finish";

const STEPS: { key: Step; label: string }[] = [
  { key: "people", label: "People" },
  { key: "accounts", label: "Accounts" },
  { key: "finish", label: "Finish" },
];

function SlipStepper({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-semibold font-mono transition-colors",
                i < stepIndex
                  ? "bg-primary text-primary-foreground"
                  : i === stepIndex
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i < stepIndex ? <Check className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-wide whitespace-nowrap",
                i === stepIndex ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "h-0 flex-1 border-t-2 border-dashed mx-2 mb-4.5",
                i < stepIndex ? "border-primary" : "border-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function LedgerSlip({
  peopleCount,
  accountCount,
  betTypeCount,
}: {
  peopleCount: number;
  accountCount: number;
  betTypeCount: number;
}) {
  const rows = [
    { icon: Users, label: "People", value: peopleCount },
    { icon: Landmark, label: "Accounts", value: accountCount },
    { icon: Trophy, label: "Bet types", value: betTypeCount },
  ];

  return (
    <Card className="border-2 border-dashed lg:sticky lg:top-6">
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="size-4 text-muted-foreground" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Your slip so far
          </h2>
        </div>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <row.icon className="size-3.5" />
                {row.label}
              </span>
              <span className="font-mono tabular-nums text-lg font-semibold">{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SetupWizard({
  people,
  bookmakers,
  betTypes,
  accounts,
}: {
  people: Person[];
  bookmakers: Bookmaker[];
  betTypes: BetType[];
  accounts: AccountPair[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("people");
  const [isPending, startTransition] = useTransition();

  const [nameInput, setNameInput] = useState("");
  const [newBookmakerName, setNewBookmakerName] = useState("");
  const [newBookmakerIsExchange, setNewBookmakerIsExchange] = useState(false);
  const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>({});

  const accountSet = new Set(accounts.map((a) => `${a.personId}:${a.bookmakerId}`));
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function handleAddPerson() {
    const name = nameInput.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await createPerson(name);
        setNameInput("");
        toast.success(`Added ${name}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't add that person");
      }
    });
  }

  function handleRemovePerson(id: string, name: string) {
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

  function handleAddAccount(personId: string, bookmakerId: string) {
    const key = `${personId}:${bookmakerId}`;
    const balance = Number(balanceInputs[key]);
    startTransition(async () => {
      try {
        await createAccountWithBalance({
          personId,
          bookmakerId,
          balance: Number.isFinite(balance) && balance !== 0 ? balance : null,
        });
        router.refresh();
      } catch {
        toast.error("Couldn't add that account");
      }
    });
  }

  function handleAddBookmaker() {
    const name = newBookmakerName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await createBookmaker({ name, isExchange: newBookmakerIsExchange, commissionRate: null });
        setNewBookmakerName("");
        setNewBookmakerIsExchange(false);
        toast.success(`Added ${name}`);
        router.refresh();
      } catch {
        toast.error("Couldn't add that bookmaker");
      }
    });
  }

  return (
    <div>
      {step !== "finish" && (
        <div className="flex justify-end mb-2">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Skip for now
          </Link>
        </div>
      )}
      <SlipStepper stepIndex={stepIndex} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {step === "people" && (
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <h2 className="font-medium">Who's in the book?</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  Add everyone whose bets and offers you'll be tracking.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Jamie"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPerson();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddPerson} disabled={isPending || !nameInput.trim()}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
                {people.length > 0 && (
                  <ul className="space-y-1.5">
                    {people.map((person) => (
                      <li
                        key={person.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                      >
                        {person.name}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemovePerson(person.id, person.name)}
                          disabled={isPending}
                          aria-label={`Remove ${person.name}`}
                        >
                          <X className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => setStep("accounts")} disabled={people.length === 0}>
                    Next
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "accounts" && (
            <Card>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-2">
                  <Landmark className="size-4 text-muted-foreground" />
                  <h2 className="font-medium">Open their accounts</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-3">
                  Which bookmakers does each person use?
                </p>

                <div className="flex gap-2 items-end">
                  <Input
                    placeholder="Add a new bookmaker (e.g. William Hill)"
                    value={newBookmakerName}
                    onChange={(e) => setNewBookmakerName(e.target.value)}
                  />
                  <label className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                    <Checkbox
                      checked={newBookmakerIsExchange}
                      onCheckedChange={(v) => setNewBookmakerIsExchange(v === true)}
                    />
                    Exchange
                  </label>
                  <Button type="button" variant="outline" onClick={handleAddBookmaker} disabled={!newBookmakerName.trim()}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>

                <div className="space-y-5">
                  {people.map((person) => (
                    <div key={person.id}>
                      <p className="text-sm font-medium mb-2">{person.name}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {bookmakers.map((bookmaker) => {
                          const key = `${person.id}:${bookmaker.id}`;
                          const has = accountSet.has(key);
                          return (
                            <div
                              key={bookmaker.id}
                              className="flex items-center gap-2 text-sm rounded-lg border px-2.5 py-1.5"
                            >
                              <Checkbox
                                checked={has}
                                disabled={isPending || has}
                                onCheckedChange={(checked) => {
                                  if (checked === true) handleAddAccount(person.id, bookmaker.id);
                                }}
                              />
                              <span className="flex-1 min-w-0 truncate">{bookmaker.name}</span>
                              {bookmaker.isExchange && <Badge variant="secondary">Exch</Badge>}
                              {!has && (
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Balance"
                                  value={balanceInputs[key] ?? ""}
                                  onChange={(e) =>
                                    setBalanceInputs((prev) => ({ ...prev, [key]: e.target.value }))
                                  }
                                  className="w-24 h-7 text-right font-mono tabular-nums shrink-0"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep("people")}>
                    Back
                  </Button>
                  <Button onClick={() => setStep("finish")}>
                    Next
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "finish" && (
            <Card>
              <CardContent className="text-center py-10 space-y-3">
                <CheckCircle2 className="size-10 text-emerald-600 mx-auto" />
                <p className="text-xl font-semibold">Ledger's open</p>
                <p className="text-sm text-muted-foreground">
                  You're all set — start logging bets and offers whenever you're ready.
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/bets/new">Add your first bet</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <LedgerSlip peopleCount={people.length} accountCount={accounts.length} betTypeCount={betTypes.length} />
        </div>
      </div>
    </div>
  );
}
