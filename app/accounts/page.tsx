import Link from "next/link";
import { ChevronRight, Landmark } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getBalancesByAccountIds } from "@/lib/balance";
import { formatSignedCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { AddPersonDialog } from "./add-person-dialog";
import { DeletePersonButton } from "./delete-person-button";

export default async function AccountsPage() {
  const userId = await requireUserId();
  const [people, accounts] = await Promise.all([
    prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { userId }, select: { id: true, personId: true, status: true } }),
  ]);

  const balances = await getBalancesByAccountIds(userId, accounts.map((account) => account.id));

  const accountsByPerson = new Map<string, { total: number; active: number; balance: number }>();
  for (const account of accounts) {
    const existing = accountsByPerson.get(account.personId) ?? { total: 0, active: 0, balance: 0 };
    existing.total += 1;
    if (account.status === "ACTIVE") existing.active += 1;
    existing.balance += balances.get(account.id) ?? 0;
    accountsByPerson.set(account.personId, existing);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <AddPersonDialog />
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Open a profile to manage bookmaker accounts, statuses, and details for that person.
      </p>

      <div className="space-y-3">
        {people.map((person) => {
          const counts = accountsByPerson.get(person.id) ?? { total: 0, active: 0, balance: 0 };
          return (
            <Card key={person.id} className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center justify-between gap-2">
                <Link href={`/accounts/${person.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {person.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{person.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Landmark className="size-3.5" />
                      {counts.total === 0
                        ? "No accounts yet"
                        : `${counts.active} active / ${counts.total} account${counts.total === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  {counts.total > 0 && (
                    <span
                      className={`font-mono tabular-nums font-semibold ${counts.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {formatSignedCurrency(counts.balance)}
                    </span>
                  )}
                  {counts.total === 0 && <DeletePersonButton id={person.id} name={person.name} />}
                  <Link href={`/accounts/${person.id}`}>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
