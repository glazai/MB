import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getBalancesByAccountIds } from "@/lib/balance";
import { BetForm } from "../bet-form";

export default async function NewBetPage() {
  const userId = await requireUserId();
  const [people, accountRows, betTypes] = await Promise.all([
    prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        personId: true,
        bookmaker: { select: { id: true, name: true, isExchange: true } },
      },
      orderBy: { bookmaker: { name: "asc" } },
    }),
    prisma.betType.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const balances = await getBalancesByAccountIds(userId, accountRows.map((a) => a.id));
  const accounts = accountRows.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Add Bet</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Log a bet for any person's account.
      </p>
      <BetForm mode="create" people={people} accounts={accounts} betTypes={betTypes} />
    </div>
  );
}
